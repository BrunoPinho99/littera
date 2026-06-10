-- ============================================================
-- Littera – Architectural Model & RLS Migration
-- ============================================================

-- 1. Create user_role ENUM (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'owner',
      'teacher',
      'student'
    );
  END IF;
END$$;

-- Note: We already have 'subscription_status_enum' created in previous migrations.
-- We will keep using it to not break existing data, but it covers 'active', 'inactive', etc.

-- 2. Update profiles table to act as our `users` extension
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

-- 3. RLS Policies on Schools (Enforcing role and active status)
-- We drop existing policies to recreate them securely.
DROP POLICY IF EXISTS "schools_select_own" ON schools;
DROP POLICY IF EXISTS "schools_update_own" ON schools;

-- Select: A user can see their own school regardless of status, so they can view the 'Aguardando Pagamento' screen.
CREATE POLICY "schools_select_own" ON schools
  FOR SELECT USING (
    id = (
      SELECT school_id FROM profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

-- Update: A user can only update their school if they are the 'owner' and the subscription is 'active'
-- (Except for Edge Functions which use service_role to bypass RLS)
CREATE POLICY "schools_update_own" ON schools
  FOR UPDATE USING (
    id = (
      SELECT school_id FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
      LIMIT 1
    ) AND subscription_status = 'active'
  );

-- 4. RLS Policies on Profiles (Users)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Select: Users can see profiles in their own school
DROP POLICY IF EXISTS "profiles_select_school" ON profiles;
CREATE POLICY "profiles_select_school" ON profiles
  FOR SELECT USING (
    school_id = (
      SELECT school_id FROM profiles AS p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );

-- Insert/Update: Only owners with active subscription can manage other profiles in the school
DROP POLICY IF EXISTS "profiles_manage_school" ON profiles;
CREATE POLICY "profiles_manage_school" ON profiles
  FOR ALL USING (
    -- The user performing the action must be an owner
    EXISTS (
      SELECT 1 FROM profiles AS p
      JOIN schools AS s ON p.school_id = s.id
      WHERE p.id = auth.uid() AND p.role = 'owner' AND s.subscription_status = 'active'
    )
    -- And the profile being managed must belong to their school
    AND school_id = (
      SELECT school_id FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );
