-- ====================================================================
-- Littera – Essay Cost Optimization, SHA-256 Deduplication & School Quotas
-- ====================================================================

-- 1. Adicionar colunas de franquia mensal na tabela public.schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS credits_per_student INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS extra_credits INTEGER NOT NULL DEFAULT 0;

-- 2. Adicionar coluna image_hash e índice de deduplicação na tabela public.redacoes
ALTER TABLE public.redacoes
  ADD COLUMN IF NOT EXISTS image_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_redacoes_dedup
  ON public.redacoes (user_id, tema, image_hash);

-- 3. RPC check_and_reserve_essay_quota
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

  v_effective_school_id := COALESCE(p_school_id, v_profile_school_id);

  -- Regra para alunos em período de teste (is_trial = true)
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

  -- Regras para alunos regulares (is_trial = false)
  -- 1. Cooldown de 10 minutos desde o último envio válido
  SELECT MAX(data_envio) INTO v_last_sent_at
  FROM public.redacoes
  WHERE user_id = p_student_id
    AND status IN ('processando', 'corrigida');

  IF v_last_sent_at IS NOT NULL AND v_last_sent_at > (NOW() - INTERVAL '10 minutes') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'COOLDOWN');
  END IF;

  -- 2. Limite diário anti-spam de 3 redações por dia (fuso America/Sao_Paulo)
  SELECT COUNT(*) INTO v_today_essays_count
  FROM public.redacoes
  WHERE user_id = p_student_id
    AND status IN ('processando', 'corrigida')
    AND DATE(data_envio AT TIME ZONE 'America/Sao_Paulo') = DATE(NOW() AT TIME ZONE 'America/Sao_Paulo');

  IF v_today_essays_count >= 3 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DAILY_LIMIT');
  END IF;

  -- 3. Pool Mensal da Escola (se p_school_id / v_effective_school_id não for nulo)
  IF v_effective_school_id IS NOT NULL THEN
    SELECT student_count, credits_per_student, extra_credits
      INTO v_student_count, v_credits_per_student, v_extra_credits
    FROM public.schools
    WHERE id = v_effective_school_id;

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
