import { createClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env para ler as variáveis
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação de segurança para te avisar se faltar a chave
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltam as variáveis de ambiente do Supabase. Verifique o arquivo .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);