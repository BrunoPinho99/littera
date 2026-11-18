-- Tabela exclusiva do CRM de prospecção B2B (NÃO misturar com public.leads do produto Littera)
CREATE TABLE IF NOT EXISTS public.crm_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text UNIQUE,
  school_name text NOT NULL,
  name text,
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  website text,
  address text,
  neighborhood text,
  city text,
  state text,
  rating numeric,
  user_ratings_total integer,
  icp_score integer,
  stage text NOT NULL DEFAULT 'novo_lead',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  source text DEFAULT 'google_places',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_prospects_created_at_idx ON public.crm_prospects (created_at DESC);
CREATE INDEX IF NOT EXISTS crm_prospects_icp_idx ON public.crm_prospects (icp_score DESC);

ALTER TABLE public.crm_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CRM prospects admin only" ON public.crm_prospects;
CREATE POLICY "CRM prospects admin only" ON public.crm_prospects
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE email IN ('bruno.pinho.brasilia@hotmail.com', 'bruno.pinho.brasilia@gmail.com')))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE email IN ('bruno.pinho.brasilia@hotmail.com', 'bruno.pinho.brasilia@gmail.com')));
