-- ====================================================================
-- Littera – Asaas Webhook Idempotency, Invoice URL & Strict RLS Paywall
-- ====================================================================

-- 1. Criar tabela de idempotência de webhooks do Asaas
CREATE TABLE IF NOT EXISTS public.asaas_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  school_id UUID,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

-- 2. Adicionar coluna invoice_url na tabela public.payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- 3. Garantir de forma idempotente que public.schools está na publicação supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'schools'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.schools;
  END IF;
END $$;

-- 4. Atualizar policies de escrita (INSERT, UPDATE, DELETE) em public.classes, public.profiles e public.redacoes
-- exigindo que a escola do usuário esteja com subscription_status = 'active'

-- 4.1. public.profiles (profiles_manage_school)
DROP POLICY IF EXISTS "profiles_manage_school" ON public.profiles;

CREATE POLICY "profiles_manage_school" ON public.profiles
  FOR ALL USING (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  );

-- 4.2. public.classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select_school" ON public.classes;
DROP POLICY IF EXISTS "classes_manage_school" ON public.classes;
DROP POLICY IF EXISTS "classes_insert_school" ON public.classes;
DROP POLICY IF EXISTS "classes_update_school" ON public.classes;
DROP POLICY IF EXISTS "classes_delete_school" ON public.classes;

CREATE POLICY "classes_select_school" ON public.classes
  FOR SELECT USING (
    school_id = public.get_user_school_id()
  );

CREATE POLICY "classes_insert_school" ON public.classes
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  );

CREATE POLICY "classes_update_school" ON public.classes
  FOR UPDATE USING (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  );

CREATE POLICY "classes_delete_school" ON public.classes
  FOR DELETE USING (
    public.get_user_role() IN ('owner', 'school_admin')
    AND school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  );

-- 4.3. public.redacoes
ALTER TABLE public.redacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redacoes_insert_active_school" ON public.redacoes;
DROP POLICY IF EXISTS "redacoes_update_active_school" ON public.redacoes;
DROP POLICY IF EXISTS "redacoes_delete_active_school" ON public.redacoes;
DROP POLICY IF EXISTS "Users can insert own essays" ON public.redacoes;
DROP POLICY IF EXISTS "Students can insert own essays" ON public.redacoes;

CREATE POLICY "redacoes_insert_active_school" ON public.redacoes
  FOR INSERT WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  );

CREATE POLICY "redacoes_update_active_school" ON public.redacoes
  FOR UPDATE USING (
    (auth.uid() = student_id OR school_id = public.get_user_school_id())
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  )
  WITH CHECK (
    (auth.uid() = student_id OR school_id = public.get_user_school_id())
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  );

CREATE POLICY "redacoes_delete_active_school" ON public.redacoes
  FOR DELETE USING (
    (auth.uid() = student_id OR (public.get_user_role() IN ('owner', 'school_admin') AND school_id = public.get_user_school_id()))
    AND EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = public.get_user_school_id()
        AND s.subscription_status = 'active'
    )
  );
