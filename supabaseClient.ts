import { createClient, SupabaseClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env para ler as variáveis
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('[Supabase] Variáveis de ambiente não encontradas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Crie um arquivo .env.local com as credenciais do Supabase.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);