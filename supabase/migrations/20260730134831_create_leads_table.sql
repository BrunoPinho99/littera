CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    school_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilita RLS para segurança
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins podem ler/atualizar
CREATE POLICY "Leads access for admins only" ON public.leads
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE email = 'bruno.pinho.brasilia@hotmail.com'
        )
    );
