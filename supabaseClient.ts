import { createClient, SupabaseClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env para ler as variáveis com fallback seguro
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://tzvjjomsubhacwiatrxk.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dmpqb21zdWJoYWN3aWF0cnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjIzNDEsImV4cCI6MjA4NTc5ODM0MX0.ylFJOFhTk9GNoF8DSAtwIutpl-R3fz_Tv4WjVcjF9aA';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas. Usando credenciais padrão do projeto.',
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
