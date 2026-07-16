-- ============================================================
-- Littera – Extensão do RLS para Owner (School Admin)
-- ============================================================
-- Objetivo: Garantir que o 'owner' de uma escola veja todas as
-- redações e correções de seus alunos, de forma isolada (multi-tenant).

DO $$ 
BEGIN
  -- 1. ESSAYS (Redações salvas)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'essays') THEN
    EXECUTE 'ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;';
    
    -- Remove política antiga se existir
    EXECUTE 'DROP POLICY IF EXISTS "essays_select_owner_school" ON public.essays;';
    
    -- Policy: Owner pode ver todas as redações da sua escola
    -- (Presumindo que essays tenha a coluna school_id, conforme modelado)
    EXECUTE '
      CREATE POLICY "essays_select_owner_school" ON public.essays
      FOR SELECT USING (
        (public.get_user_role() = ''owner'') AND 
        (school_id = public.get_user_school_id())
      );
    ';
  END IF;

  -- 2. CORRECTION_RESULTS (Resultados de Correção)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'correction_results') THEN
    EXECUTE 'ALTER TABLE public.correction_results ENABLE ROW LEVEL SECURITY;';
    
    EXECUTE 'DROP POLICY IF EXISTS "results_select_owner_school" ON public.correction_results;';
    
    -- Policy: Owner pode ver todos os resultados da sua escola
    EXECUTE '
      CREATE POLICY "results_select_owner_school" ON public.correction_results
      FOR SELECT USING (
        (public.get_user_role() = ''owner'') AND 
        (school_id = public.get_user_school_id())
      );
    ';
  END IF;

  -- 3. GARANTIR QUE OUTRAS TABELAS FUTURAS POSSAM USAR ESSE PADRÃO
  -- O owner sempre terá visibilidade total sobre registros que
  -- compartilhem o mesmo `school_id`.
END $$;
