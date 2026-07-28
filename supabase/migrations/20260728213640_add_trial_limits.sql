ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.trial_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    whatsapp TEXT,
    auth_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC for limit checking
CREATE OR REPLACE FUNCTION public.check_essay_limit(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_trial BOOLEAN;
    v_trial_ends_at TIMESTAMPTZ;
    v_today_essays_count INT;
BEGIN
    SELECT is_trial, trial_ends_at INTO v_is_trial, v_trial_ends_at
    FROM public.profiles
    WHERE id = p_student_id;

    -- Se não é trial, libera (sem limite de 2 por dia)
    IF NOT COALESCE(v_is_trial, false) THEN
        RETURN TRUE;
    END IF;

    -- Se é trial e expirou
    IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at < NOW() THEN
        RETURN FALSE;
    END IF;

    -- Conta envios no dia civil (America/Sao_Paulo)
    -- data_envio é TIMESTAMPTZ, guardado como UTC no banco.
    SELECT COUNT(*) INTO v_today_essays_count
    FROM public.saved_essays
    WHERE student_id = p_student_id
      AND DATE(data_envio AT TIME ZONE 'America/Sao_Paulo') = DATE(NOW() AT TIME ZONE 'America/Sao_Paulo');

    -- Limite de 2
    IF v_today_essays_count >= 2 THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_essay_limit(UUID) TO authenticated, service_role;
