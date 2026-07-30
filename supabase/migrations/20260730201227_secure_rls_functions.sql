-- ====================================================================
-- Littera – Secure RLS Functions (Remove JWT spoofing vulnerability)
-- ====================================================================
-- Prevents a malicious user from escalating their privileges by modifying
-- their own user_metadata via the Supabase Auth API, which previously
-- took precedence over the secure `profiles` table in our RLS functions.

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  -- We rely ONLY on the trusted profiles table, bypassing RLS via SECURITY DEFINER.
  -- This prevents malicious user_metadata spoofing while avoiding infinite recursion.
  SELECT school_id INTO v_school_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN v_school_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- We rely ONLY on the trusted profiles table, bypassing RLS via SECURITY DEFINER.
  -- This prevents malicious user_metadata spoofing while avoiding infinite recursion.
  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN v_role;
END;
$$;
