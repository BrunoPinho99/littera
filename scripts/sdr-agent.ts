import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase usando variáveis de ambiente do GitHub Actions
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSDRAgent() {
  console.log("🤖 Agente SDR do Littera iniciado...");

  // Exemplo de dados simulados da prospecção de uma escola/cursinho em Brasília
  // (Aqui você pode plugar uma lógica de scraping ou requisição a uma API de diretórios educacionais)
  const novoLead = {
    school_name: "Colégio Pioneiro Brasília",
    contact_name: "Coordenação Pedagógica",
    email: "contato@colegiopioneiro.com.br",
    phone: "(61) 3333-4444",
    city: "Brasília",
    state: "DF",
    stage: "novo_lead",
    notes: "Capturado automaticamente pelo Agente SDR via GitHub Actions."
  };

  // Verifica se o lead já existe pelo e-mail para evitar duplicidade
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .eq('email', novoLead.email)
    .single();

  if (existingLead) {
    console.log(`⚠️ O lead ${novoLead.school_name} já está na base.`);
    return;
  }

  // Insere o novo lead no Supabase
  const { data, error } = await supabase.from('leads').insert([novoLead]);

  if (error) {
    console.error("❌ Erro ao inserir lead no Supabase:", error);
    process.exit(1);
  }

  console.log("✅ Lead de escola inserido com sucesso:", data);
}

runSDRAgent();
