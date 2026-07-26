-- Security Definer Functions to bypass RLS and prevent infinite recursion
-- Usamos LANGUAGE plpgsql e STABLE para garantir que o otimizador do PostgreSQL
-- NUNCA faça inlining da consulta dentro das políticas RLS.

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
  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_school_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon, service_role;

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "schools_select_own" ON schools;
DROP POLICY IF EXISTS "schools_update_own" ON schools;
DROP POLICY IF EXISTS "profiles_select_school" ON profiles;
DROP POLICY IF EXISTS "profiles_manage_school" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

-- Recreate Policies using the Secure Functions

-- SCHOOLS
CREATE POLICY "schools_select_own" ON schools
  FOR SELECT USING (
    id = public.get_user_school_id()
  );

CREATE POLICY "schools_update_own" ON schools
  FOR UPDATE USING (
    id = public.get_user_school_id() AND 
    public.get_user_role() IN ('owner', 'school_admin')
  );

-- PROFILES
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    id = auth.uid()
  );

CREATE POLICY "profiles_select_school" ON profiles
  FOR SELECT USING (
    school_id = public.get_user_school_id()
  );

CREATE POLICY "profiles_manage_school" ON profiles
  FOR ALL USING (
    public.get_user_role() IN ('owner', 'school_admin') AND 
    school_id = public.get_user_school_id()
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'school_admin') AND 
    school_id = public.get_user_school_id()
  );
