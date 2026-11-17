import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase usando variáveis de ambiente do GitHub Actions
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 1,
    },
  },
});

async function runSDRAgent() {
  console.log("🤖 Agente SDR do Littera iniciado...");

  // Exemplo de dados simulados da prospecção de uma escola/cursinho em Brasília
  // (Aqui você pode plugar uma lógica de scraping ou requisição a uma API de diretórios educacionais)
  const novoLead = {
    name: "Coordenação Pedagógica",
    school_name: "Colégio Pioneiro Brasília",
    email: "contato@colegiopioneiro.com.br",
    whatsapp: "(61) 3333-4444",
    status: "pending",
  };

  console.log("Supabase URL configured:", !!supabaseUrl, supabaseUrl ? supabaseUrl.substring(0, 25) + '...' : '');
  console.log("Supabase Key configured:", !!supabaseKey, supabaseKey ? supabaseKey.substring(0, 15) + '... (length: ' + supabaseKey.length + ')' : '');

  // Verifica se o lead já existe pelo e-mail para evitar duplicidade
  const checkRes = await supabase
    .from('leads')
    .select('id')
    .eq('email', novoLead.email);

  if (checkRes.error) {
    console.error("❌ Erro no select de verificação:", checkRes.error);
    console.error("Status:", checkRes.status, checkRes.statusText);
  }

  const existingLead = checkRes.data?.[0];

  if (existingLead) {
    console.log(`⚠️ O lead ${novoLead.school_name} já está na base.`);
    return;
  }

  // Insere o novo lead no Supabase
  const { data, error } = await supabase.from('leads').insert([novoLead]).select();

  if (error) {
    console.error("❌ Erro ao inserir lead no Supabase:", error);
    process.exit(1);
  }

  console.log("✅ Lead de escola inserido com sucesso:", novoLead.school_name);
}

runSDRAgent();
