-- Security Definer Functions to bypass RLS and prevent infinite recursion

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "schools_select_own" ON schools;
DROP POLICY IF EXISTS "schools_update_own" ON schools;
DROP POLICY IF EXISTS "profiles_select_school" ON profiles;
DROP POLICY IF EXISTS "profiles_manage_school" ON profiles;

-- Recreate Policies using the Secure Functions

-- SCHOOLS
CREATE POLICY "schools_select_own" ON schools
  FOR SELECT USING (
    id = public.get_user_school_id()
  );

CREATE POLICY "schools_update_own" ON schools
  FOR UPDATE USING (
    id = public.get_user_school_id() AND 
    public.get_user_role() = 'owner' AND 
    subscription_status = 'active'
  );

-- PROFILES
CREATE POLICY "profiles_select_school" ON profiles
  FOR SELECT USING (
    school_id = public.get_user_school_id()
  );

CREATE POLICY "profiles_manage_school" ON profiles
  FOR ALL USING (
    public.get_user_role() = 'owner' AND 
    school_id = public.get_user_school_id() AND
    EXISTS (
      SELECT 1 FROM schools 
      WHERE id = public.get_user_school_id() AND subscription_status = 'active'
    )
  );
