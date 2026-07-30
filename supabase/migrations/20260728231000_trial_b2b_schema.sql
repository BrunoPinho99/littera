-- 1. Create the Littera Trial hidden school if it doesn't exist
INSERT INTO public.schools (id, name, email, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Littera Trial', 'trial@littera.app.br', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Add columns to trial_history and profiles
ALTER TABLE public.trial_history
  ADD COLUMN IF NOT EXISTS school_name text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_school_name text,
  ADD COLUMN IF NOT EXISTS originated_from_trial boolean DEFAULT false;

-- 3. Create trial_alerts_sent table
CREATE TABLE IF NOT EXISTS public.trial_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  threshold_reached_at timestamptz DEFAULT now(),
  UNIQUE (school_name)
);

ALTER TABLE public.trial_alerts_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_manage_alerts" ON public.trial_alerts_sent FOR ALL USING (true);

-- 4. Create the migrate_trial_student RPC
CREATE OR REPLACE FUNCTION public.migrate_trial_student(
  p_student_id uuid,
  p_new_school_id uuid
) RETURNS void AS $$
BEGIN
  -- Update profiles
  UPDATE public.profiles
  SET 
    school_id = p_new_school_id,
    is_trial = false,
    trial_started_at = NULL,
    trial_ends_at = NULL,
    originated_from_trial = true
  WHERE id = p_student_id;

  -- Update redacoes
  UPDATE public.redacoes
  SET school_id = p_new_school_id
  WHERE user_id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add Restrictive Policy to redacoes to enforce trial limits at DB level
-- Requires check_essay_limit to be defined (from previous migration)
DROP POLICY IF EXISTS "block_trial_limit_restrictive" ON public.redacoes;
CREATE POLICY "block_trial_limit_restrictive" ON public.redacoes
AS RESTRICTIVE FOR INSERT
WITH CHECK (
  public.check_essay_limit(auth.uid())
);
