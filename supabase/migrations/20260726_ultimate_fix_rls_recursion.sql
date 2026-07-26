-- ====================================================================
-- Littera – Ultimate Fix for RLS Infinite Recursion on profiles & schools
-- ====================================================================
-- Resolução definitiva do erro: "infinite recursion detected in policy for relation profiles"
-- Substitui funções LANGUAGE sql por LANGUAGE plpgsql com SECURITY DEFINER e STABLE
-- para impedir que o otimizador do PostgreSQL faça inlining nas políticas RLS.

-- 1. Recriar funções auxiliares com LANGUAGE plpgsql
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

-- Grant permissão de execução
GRANT EXECUTE ON FUNCTION public.get_user_school_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon, service_role;

-- 2. Limpar políticas existentes problemáticas na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_school" ON public.profiles;
DROP POLICY IF EXISTS "profiles_manage_school" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- 3. Recriar políticas limpas e sem recursão em profiles
-- Leitura: O próprio usuário pode ler seu perfil SEMPRE (evita qualquer chamada de função)
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
  );

-- Leitura: Usuários da mesma escola podem ver os membros
CREATE POLICY "profiles_select_school" ON public.profiles
  FOR SELECT USING (
    school_id = public.get_user_school_id()
  );

-- Gestão (INSERT, UPDATE, DELETE): Admins/Owners podem gerenciar membros de sua escola
CREATE POLICY "profiles_manage_school" ON public.profiles
  FOR ALL USING (
    public.get_user_role() IN ('owner', 'school_admin') AND 
    school_id = public.get_user_school_id()
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'school_admin') AND 
    school_id = public.get_user_school_id()
  );

-- 4. Limpar e recriar políticas em schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_select_own" ON public.schools;
DROP POLICY IF EXISTS "schools_update_own" ON public.schools;

CREATE POLICY "schools_select_own" ON public.schools
  FOR SELECT USING (
    id = public.get_user_school_id()
  );

CREATE POLICY "schools_update_own" ON public.schools
  FOR UPDATE USING (
    id = public.get_user_school_id() AND 
    public.get_user_role() IN ('owner', 'school_admin')
  );
