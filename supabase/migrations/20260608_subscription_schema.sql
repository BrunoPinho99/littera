-- ============================================================
-- Littera – Asaas Subscription Schema Migration
-- ============================================================
-- Idempotent: safe to run multiple times.

-- 1. Criar ENUM para subscription_status (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
    CREATE TYPE subscription_status_enum AS ENUM (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'inactive'
    );
  END IF;
END$$;

-- 2. Adicionar colunas de assinatura na tabela schools (se não existirem)
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status_enum DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS plano_ativado_em TIMESTAMPTZ;

-- 3. Índices para lookups rápidos do webhook
CREATE INDEX IF NOT EXISTS idx_schools_asaas_customer_id ON schools (asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_schools_subscription_id ON schools (subscription_id);

-- 4. RLS – Habilitar na tabela schools
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Policy: Leitura – usuários só veem a própria escola
DROP POLICY IF EXISTS "schools_select_own" ON schools;
CREATE POLICY "schools_select_own" ON schools
  FOR SELECT USING (
    id = (
      SELECT school_id FROM profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

-- Policy: Update – usuários só atualizam a própria escola
DROP POLICY IF EXISTS "schools_update_own" ON schools;
CREATE POLICY "schools_update_own" ON schools
  FOR UPDATE USING (
    id = (
      SELECT school_id FROM profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

-- Policy: Service Role ignora RLS automaticamente (padrão do Supabase).
-- O webhook usa service_role key para fazer bypass.
