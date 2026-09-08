-- ====================================================================
-- Littera – Auth Hook for Custom JWT Claims (O(1) RLS Performance)
-- ====================================================================
-- Implementa um Auth Hook para injetar role e school_id da tabela profiles
-- no JWT do usuário (dentro do app_metadata, que é imutável via API de auth).
-- Atualiza as funções RLS para priorizarem o JWT em vez de consultar o banco.

-- 1. Cria a função de Auth Hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_school_id uuid;
BEGIN
  -- Busca os dados do usuário com base no UID fornecido pelo Auth
  SELECT role::text, school_id INTO user_role, user_school_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- Garante que o bloco app_metadata existe no JWT
  IF claims->'app_metadata' IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb);
  END IF;

  -- Insere o role no app_metadata (se houver)
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  ELSE
    claims := claims #- '{app_metadata,role}'; -- Remove se null
  END IF;

  -- Insere o school_id no app_metadata (se houver)
  IF user_school_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,school_id}', to_jsonb(user_school_id));
  ELSE
    claims := claims #- '{app_metadata,school_id}'; -- Remove se null
  END IF;

  -- Atualiza o payload do evento com as novas claims
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Permite ao sistema de Autenticação interno executar esta função
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoga a permissão de outras roles para evitar abuso
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- 2. Atualiza get_user_school_id para ler do JWT primeiramente (O(1))
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt jsonb;
  v_school_id UUID;
BEGIN
  -- 1. Lê diretamente da memória (JWT), ignorando custo de banco de dados
  v_jwt := auth.jwt();
  IF v_jwt IS NOT NULL AND v_jwt->'app_metadata'->>'school_id' IS NOT NULL THEN
    RETURN (v_jwt->'app_metadata'->>'school_id')::uuid;
  END IF;

  -- 2. Fallback caso o hook falhe, não esteja ativado, ou seja uma requisição antiga (Sessão antiga)
  SELECT school_id INTO v_school_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_school_id;
END;
$$;

-- 3. Atualiza get_user_role para ler do JWT primeiramente (O(1))
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt jsonb;
  v_role text;
BEGIN
  -- 1. Lê diretamente da memória (JWT), ignorando custo de banco de dados
  v_jwt := auth.jwt();
  IF v_jwt IS NOT NULL AND v_jwt->'app_metadata'->>'role' IS NOT NULL THEN
    RETURN v_jwt->'app_metadata'->>'role';
  END IF;

  -- 2. Fallback caso o hook falhe, não esteja ativado, ou seja uma requisição antiga
  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_role;
END;
$$;
