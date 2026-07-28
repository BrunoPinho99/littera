-- ====================================================================
-- Littera – Fix RLS for users updating their own profile
-- ====================================================================
-- Permite que o usuário (aluno ou professor) possa atualizar e inserir
-- o próprio perfil ao ativar a conta e aceitar convite (status = 'active').

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );
