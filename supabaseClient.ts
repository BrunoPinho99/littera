import { createClient, SupabaseClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env para ler as variáveis
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação de segurança para te avisar se faltar a chave (não-fatal)
if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Variáveis de ambiente não encontradas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Funcionalidades de banco de dados estarão desativadas. Crie um arquivo .env.local com as credenciais do Supabase.');
}

export const supabase: SupabaseClient = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');