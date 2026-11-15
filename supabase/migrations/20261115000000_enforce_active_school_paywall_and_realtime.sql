-- ====================================================================
-- Littera – Enforce Active School Paywall (RLS) & Realtime on schools
-- ====================================================================

-- 1. Garantir de forma idempotente que public.schools faz parte da publicação supabase_realtime
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

-- Função auxiliar SECURITY DEFINER para checar se a escola do usuário está com assinatura ativa
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

  RETURN LOWER(COALESCE(v_status, '')) = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_school_active() TO authenticated, anon, service_role;

-- 2. Atualizar a policy profiles_manage_school para exigir subscription_status = 'active' em INSERT, UPDATE, DELETE
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

-- 3. Garantir RLS e policies na tabela public.classes exigindo subscription_status = 'active' para INSERT, UPDATE, DELETE
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
