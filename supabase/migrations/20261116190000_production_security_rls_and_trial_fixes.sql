-- ============================================================================
-- Littera – Consolidated Production Security, RLS, Paywall & Trial Fixes
-- ============================================================================
-- Resolves:
--   BLOCKER-1 : Prevent self-service role/school_id escalation on public.profiles
--   BLOCKER-2 : Prevent school owners from modifying billing/quota fields on public.schools
--   BLOCKER-4 : Fix public.redacoes RLS (user_id vs student_id, add SELECT, restrict UPDATE)
--   BLOCKER-6 : Provide get_public_school_registration_info RPC for /matricula/:schoolId
--   BLOCKER-7 : Lock down public.migrate_trial_student to service_role only
--   BLOCKER-11: Allow subscription_status IN ('active', 'trialing') in paywall & RLS
--   HIGH-7    : Enable/fix RLS on assignments, payments, trial_history, trial_alerts_sent, notifications
--   MEDIUM-1  : Add billing_cycle column on public.schools
--   MEDIUM-5  : Enforce 10-minute cooldown for trial students too in check_and_reserve_essay_quota

-- ----------------------------------------------------------------------------
-- 1. Schema Fixes (MEDIUM-1 & user_role enum compatibility)
-- ----------------------------------------------------------------------------
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'MONTHLY';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'school_admin';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'professor';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. BLOCKER-11: Update is_user_school_active() to allow 'active' and 'trialing'
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_user_school_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT subscription_status::text INTO v_status
  FROM public.schools
  WHERE id = public.get_user_school_id()
  LIMIT 1;

  RETURN LOWER(COALESCE(v_status, '')) IN ('active', 'trialing');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_school_active() TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- 3. BLOCKER-1: Lock down public.profiles against self-escalation & cross-tenant takeover
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_manage_school" ON public.profiles;

-- Users can update their own non-privileged profile fields (trigger enforces column immutability)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

-- School owners/admins can manage student/teacher profiles in their own active/trialing school
CREATE POLICY "profiles_manage_school" ON public.profiles
  FOR ALL USING (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND role::text IN ('student', 'teacher', 'professor')
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Allow trusted backend operations via service_role or direct postgres migrations
  IF COALESCE(auth.role(), '') = 'service_role'
     OR (auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin')) THEN
    RETURN NEW;
  END IF;

  v_caller_role := public.get_user_role();

  IF TG_OP = 'INSERT' THEN
    IF v_caller_role NOT IN ('owner', 'school_admin')
       OR NEW.school_id IS DISTINCT FROM public.get_user_school_id() THEN
      RAISE EXCEPTION 'Insufficient privileges to create profile'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.role::text NOT IN ('student', 'teacher', 'professor') THEN
      RAISE EXCEPTION 'Cannot assign privileged role via client API'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Never allow changing tenant (school_id) or trial entitlements from client API
    IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'Cannot modify school_id via client API'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.is_trial IS DISTINCT FROM OLD.is_trial
       OR NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
       OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
       OR NEW.originated_from_trial IS DISTINCT FROM OLD.originated_from_trial
       OR NEW.trial_school_name IS DISTINCT FROM OLD.trial_school_name THEN
      RAISE EXCEPTION 'Cannot modify trial attributes via client API'
        USING ERRCODE = '42501';
    END IF;

    -- Role changes are forbidden on self and forbidden outside student/teacher
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF auth.uid() = OLD.id
         OR v_caller_role NOT IN ('owner', 'school_admin')
         OR NEW.role::text NOT IN ('student', 'teacher', 'professor') THEN
        RAISE EXCEPTION 'Cannot modify role via client API'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    -- Prevent linking class_id from a different school
    IF NEW.class_id IS DISTINCT FROM OLD.class_id AND NEW.class_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = NEW.class_id AND c.school_id = OLD.school_id
      ) THEN
        RAISE EXCEPTION 'class_id does not belong to user school'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    -- Status transitions: user can only transition own profile from invited -> active
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (v_caller_role IN ('owner', 'school_admin') AND OLD.school_id = public.get_user_school_id())
        OR (auth.uid() = OLD.id AND OLD.status = 'invited' AND NEW.status = 'active')
      ) THEN
        RAISE EXCEPTION 'Cannot modify account status via client API'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- ----------------------------------------------------------------------------
-- 4. BLOCKER-2: Lock down public.schools billing, subscription & quota fields
-- ----------------------------------------------------------------------------
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_update_own" ON public.schools;
CREATE POLICY "schools_update_own" ON public.schools
  FOR UPDATE USING (
    id = public.get_user_school_id()
    AND public.get_user_role() IN ('owner', 'school_admin')
    AND subscription_status IN ('active', 'trialing')
  )
  WITH CHECK (
    id = public.get_user_school_id()
    AND public.get_user_role() IN ('owner', 'school_admin')
    AND subscription_status IN ('active', 'trialing')
  );

CREATE OR REPLACE FUNCTION public.protect_school_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role'
     OR (auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin')) THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.student_count IS DISTINCT FROM OLD.student_count
     OR NEW.credits_per_student IS DISTINCT FROM OLD.credits_per_student
     OR NEW.extra_credits IS DISTINCT FROM OLD.extra_credits
     OR NEW.subscription_id IS DISTINCT FROM OLD.subscription_id
     OR NEW.asaas_customer_id IS DISTINCT FROM OLD.asaas_customer_id
     OR NEW.plano_ativado_em IS DISTINCT FROM OLD.plano_ativado_em
     OR NEW.is_trial_school IS DISTINCT FROM OLD.is_trial_school
     OR NEW.billing_cycle IS DISTINCT FROM OLD.billing_cycle THEN
    RAISE EXCEPTION 'Cannot modify billing or quota columns via client API'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_school_billing_columns ON public.schools;
CREATE TRIGGER trg_protect_school_billing_columns
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_school_billing_columns();

-- ----------------------------------------------------------------------------
-- 5. BLOCKER-11: Update public.classes write policies to allow 'trialing'
-- ----------------------------------------------------------------------------
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_insert_school" ON public.classes;
DROP POLICY IF EXISTS "classes_update_school" ON public.classes;
DROP POLICY IF EXISTS "classes_delete_school" ON public.classes;

CREATE POLICY "classes_insert_school" ON public.classes
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "classes_update_school" ON public.classes
  FOR UPDATE USING (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "classes_delete_school" ON public.classes
  FOR DELETE USING (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

-- ----------------------------------------------------------------------------
-- 6. BLOCKER-4 & BLOCKER-11: Fix public.redacoes RLS (user_id, SELECT, UPDATE)
-- ----------------------------------------------------------------------------
ALTER TABLE public.redacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redacoes_select_own_or_staff" ON public.redacoes;
DROP POLICY IF EXISTS "redacoes_insert_active_school" ON public.redacoes;
DROP POLICY IF EXISTS "redacoes_update_active_school" ON public.redacoes;
DROP POLICY IF EXISTS "redacoes_delete_active_school" ON public.redacoes;
DROP POLICY IF EXISTS "Users can view own essays" ON public.redacoes;
DROP POLICY IF EXISTS "Students can view own essays" ON public.redacoes;
DROP POLICY IF EXISTS "Teachers can view school essays" ON public.redacoes;
DROP POLICY IF EXISTS "Users can insert own essays" ON public.redacoes;
DROP POLICY IF EXISTS "Students can insert own essays" ON public.redacoes;

CREATE POLICY "redacoes_select_own_or_staff" ON public.redacoes
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      school_id = public.get_user_school_id()
      AND public.get_user_role() IN ('owner', 'school_admin', 'teacher', 'professor')
    )
  );

CREATE POLICY "redacoes_insert_active_school" ON public.redacoes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (school_id IS NULL OR school_id = public.get_user_school_id())
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "redacoes_update_active_school" ON public.redacoes
  FOR UPDATE USING (
    (
      auth.uid() = user_id
      OR (
        school_id = public.get_user_school_id()
        AND public.get_user_role() IN ('owner', 'school_admin', 'teacher', 'professor')
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  )
  WITH CHECK (
    (
      auth.uid() = user_id
      OR (
        school_id = public.get_user_school_id()
        AND public.get_user_role() IN ('owner', 'school_admin', 'teacher', 'professor')
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "redacoes_delete_active_school" ON public.redacoes
  FOR DELETE USING (
    (
      auth.uid() = user_id
      OR (
        public.get_user_role() IN ('owner', 'school_admin')
        AND school_id = public.get_user_school_id()
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

-- ----------------------------------------------------------------------------
-- 7. HIGH-7: RLS for assignments, payments, trial_history, trial_alerts_sent, notifications
-- ----------------------------------------------------------------------------

-- 7.1. public.assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_select_school" ON public.assignments;
DROP POLICY IF EXISTS "assignments_insert_staff" ON public.assignments;
DROP POLICY IF EXISTS "assignments_update_staff" ON public.assignments;
DROP POLICY IF EXISTS "assignments_delete_staff" ON public.assignments;

CREATE POLICY "assignments_select_school" ON public.assignments
  FOR SELECT USING (
    school_id = public.get_user_school_id()
  );

CREATE POLICY "assignments_insert_staff" ON public.assignments
  FOR INSERT WITH CHECK (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('owner', 'school_admin', 'teacher', 'professor')
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "assignments_update_staff" ON public.assignments
  FOR UPDATE USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('owner', 'school_admin', 'teacher', 'professor')
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('owner', 'school_admin', 'teacher', 'professor')
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "assignments_delete_staff" ON public.assignments
  FOR DELETE USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('owner', 'school_admin', 'teacher', 'professor')
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status IN ('active', 'trialing')
    )
  );

-- 7.2. public.payments (only school owner/admin can SELECT; writes via service_role only)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_owner" ON public.payments;
CREATE POLICY "payments_select_owner" ON public.payments
  FOR SELECT USING (
    school_id = public.get_user_school_id()
    AND public.get_user_role() IN ('owner', 'school_admin')
  );

-- 7.3. public.trial_history (service_role only)
ALTER TABLE public.trial_history ENABLE ROW LEVEL SECURITY;

-- 7.4. public.trial_alerts_sent (restrict open policy to service_role)
ALTER TABLE public.trial_alerts_sent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_manage_alerts" ON public.trial_alerts_sent;
CREATE POLICY "service_role_manage_alerts" ON public.trial_alerts_sent
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 7.5. public.notifications (allow school staff to insert notifications for members of their school)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_insert_own_or_staff" ON public.notifications;
CREATE POLICY "notifications_insert_own_or_staff" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR (
      public.get_user_role() IN ('owner', 'school_admin', 'teacher', 'professor')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = notifications.user_id
          AND p.school_id = public.get_user_school_id()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 8. MEDIUM-5: Enforce 10-min cooldown for trial students & check school status
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_reserve_essay_quota(
  p_student_id UUID,
  p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_trial BOOLEAN;
  v_trial_ends_at TIMESTAMPTZ;
  v_profile_school_id UUID;
  v_effective_school_id UUID;
  v_school_status TEXT;
  v_today_essays_count INT;
  v_last_sent_at TIMESTAMPTZ;
  v_school_month_count INT;
  v_student_count INT;
  v_credits_per_student INT;
  v_extra_credits INT;
  v_total_school_quota INT;
BEGIN
  SELECT is_trial, trial_ends_at, school_id
    INTO v_is_trial, v_trial_ends_at, v_profile_school_id
  FROM public.profiles
  WHERE id = p_student_id;

  v_effective_school_id := COALESCE(v_profile_school_id, p_school_id);

  -- Verificar status da escola (active ou trialing)
  IF v_effective_school_id IS NOT NULL THEN
    SELECT subscription_status::text, student_count, credits_per_student, extra_credits
      INTO v_school_status, v_student_count, v_credits_per_student, v_extra_credits
    FROM public.schools
    WHERE id = v_effective_school_id;

    IF LOWER(COALESCE(v_school_status, '')) NOT IN ('active', 'trialing') THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'SCHOOL_INACTIVE');
    END IF;
  END IF;

  -- 1. Cooldown anti-spam de 10 minutos para TODOS os alunos (incluindo trial)
  SELECT MAX(data_envio) INTO v_last_sent_at
  FROM public.redacoes
  WHERE user_id = p_student_id
    AND status IN ('processando', 'corrigida');

  IF v_last_sent_at IS NOT NULL AND v_last_sent_at > (NOW() - INTERVAL '10 minutes') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'COOLDOWN');
  END IF;

  -- 2. Regras para alunos em período de teste (is_trial = true)
  IF COALESCE(v_is_trial, false) THEN
    IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at < NOW() THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'TRIAL_EXPIRED');
    END IF;

    SELECT COUNT(*) INTO v_today_essays_count
    FROM public.redacoes
    WHERE user_id = p_student_id
      AND status IN ('processando', 'corrigida')
      AND DATE(data_envio AT TIME ZONE 'America/Sao_Paulo') = DATE(NOW() AT TIME ZONE 'America/Sao_Paulo');

    IF v_today_essays_count >= 2 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'DAILY_LIMIT');
    END IF;

    RETURN jsonb_build_object('allowed', true, 'reason', 'OK');
  END IF;

  -- 3. Limite diário anti-spam de 3 redações por dia para alunos regulares (fuso America/Sao_Paulo)
  SELECT COUNT(*) INTO v_today_essays_count
  FROM public.redacoes
  WHERE user_id = p_student_id
    AND status IN ('processando', 'corrigida')
    AND DATE(data_envio AT TIME ZONE 'America/Sao_Paulo') = DATE(NOW() AT TIME ZONE 'America/Sao_Paulo');

  IF v_today_essays_count >= 3 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DAILY_LIMIT');
  END IF;

  -- 4. Pool Mensal da Escola (se v_effective_school_id não for nulo)
  IF v_effective_school_id IS NOT NULL THEN
    v_total_school_quota := (COALESCE(v_student_count, 0) * COALESCE(v_credits_per_student, 12)) + COALESCE(v_extra_credits, 0);

    SELECT COUNT(*) INTO v_school_month_count
    FROM public.redacoes
    WHERE school_id = v_effective_school_id
      AND status IN ('processando', 'corrigida')
      AND (data_envio AT TIME ZONE 'America/Sao_Paulo') >= date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo');

    IF v_school_month_count >= v_total_school_quota THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'SCHOOL_QUOTA_EXCEEDED');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'OK');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_reserve_essay_quota(UUID, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 9. BLOCKER-7: Lock down migrate_trial_student & BLOCKER-6: Public registration RPC
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.migrate_trial_student(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_trial_student(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_school_registration_info(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school RECORD;
  v_classes JSONB;
BEGIN
  SELECT id, name, subscription_status
  INTO v_school
  FROM public.schools
  WHERE id = p_school_id
    AND subscription_status IN ('active', 'trialing')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'grade', COALESCE(to_jsonb(c)->>'year', to_jsonb(c)->>'grade', ''),
        'shift', COALESCE(to_jsonb(c)->>'shift', 'Matutino'),
        'school_id', c.school_id
      )
      ORDER BY c.name
    ),
    '[]'::jsonb
  )
  INTO v_classes
  FROM public.classes c
  WHERE c.school_id = p_school_id;

  RETURN jsonb_build_object(
    'id', v_school.id,
    'name', v_school.name,
    'classes', v_classes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_school_registration_info(UUID) TO anon, authenticated, service_role;

-- Safe school-scoped peer ranking RPC (aggregates scores without leaking essay text/emails)
CREATE OR REPLACE FUNCTION public.get_school_peer_rankings(p_school_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  class_id UUID,
  class_name TEXT,
  school_name TEXT,
  points BIGINT,
  essays_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_school_id UUID;
BEGIN
  v_target_school_id := public.get_user_school_id();
  IF v_target_school_id IS NULL THEN
    RETURN;
  END IF;

  IF p_school_id IS NOT NULL AND p_school_id IS DISTINCT FROM v_target_school_id THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.full_name, 'Estudante') AS full_name,
    COALESCE(to_jsonb(p)->>'avatar_url', '') AS avatar_url,
    p.class_id,
    COALESCE(c.name, 'Turma') AS class_name,
    COALESCE(s.name, 'Minha Escola') AS school_name,
    COALESCE(SUM(r.total_score), 0)::BIGINT AS points,
    COUNT(r.id)::BIGINT AS essays_count
  FROM public.profiles p
  JOIN public.schools s ON s.id = p.school_id
  LEFT JOIN public.classes c ON c.id = p.class_id
  LEFT JOIN public.redacoes r ON r.user_id = p.id AND r.status = 'corrigida'
  WHERE p.school_id = v_target_school_id
    AND p.role::text = 'student'
  GROUP BY p.id, p.full_name, p.class_id, c.name, s.name, to_jsonb(p)->>'avatar_url'
  ORDER BY points DESC, essays_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_peer_rankings(UUID) TO authenticated, service_role;

-- Safe unauthenticated demo essay result lookup by exact UUID (prevents anon enumeration)
CREATE OR REPLACE FUNCTION public.get_demo_essay_result(p_essay_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  IF p_essay_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    id,
    status,
    total_score,
    competencias_json,
    comentario_geral,
    zero_reason,
    strengths_json,
    improvements_json,
    annotations_json,
    conteudo
  INTO v_row
  FROM public.redacoes
  WHERE id = p_essay_id
    AND user_id IS NULL
    AND school_id IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'total_score', v_row.total_score,
    'competencias_json', v_row.competencias_json,
    'comentario_geral', v_row.comentario_geral,
    'zero_reason', v_row.zero_reason,
    'strengths_json', v_row.strengths_json,
    'improvements_json', v_row.improvements_json,
    'annotations_json', v_row.annotations_json,
    'conteudo', v_row.conteudo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_demo_essay_result(UUID) TO anon, authenticated, service_role;
