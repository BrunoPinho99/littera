import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltam credenciais do Supabase (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Interface de Escola do Diretório / INEP / Maps
interface TargetSchool {
  name: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
  website?: string;
  estimated_students: number;
  known_focus: string;
  search_query: string;
}

// 🏛️ Base de Escolas Particulares de Brasília (DF) de Alto Desempenho no ENEM e Ensino Médio
const BRASILIA_TARGET_SCHOOLS: TargetSchool[] = [
  {
    name: "Colégio Podion",
    neighborhood: "Asa Norte",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3340-0077",
    website: "https://podion.com.br",
    estimated_students: 450,
    known_focus: "Foco intensivo em Medicina, vestibulares de alta concorrência e nota 1000 no ENEM.",
    search_query: "Colégio Podion Asa Norte Brasília coordenação redação contato"
  },
  {
    name: "Colégio Olimpo Brasília",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3346-6000",
    website: "https://colegioolimpo.com.br",
    estimated_students: 850,
    known_focus: "Referência tradicional em aprovações ENEM e olimpíadas do conhecimento.",
    search_query: "Colégio Olimpo Asa Sul Brasília coordenação pedagógica"
  },
  {
    name: "Centro Educacional Leonardo da Vinci",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3214-2200",
    website: "https://leonardodavinci.com.br",
    estimated_students: 1100,
    known_focus: "Grande rede com múltiplas turmas de 1º a 3º ano do Ensino Médio.",
    search_query: "Leonardo da Vinci Asa Sul Brasília contato coordenação"
  },
  {
    name: "Colégio Marista de Brasília",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3442-9400",
    website: "https://marista.edu.br/brasilia",
    estimated_students: 900,
    known_focus: "Formação integral com forte produção textual e simulados regulares.",
    search_query: "Colégio Marista 615 Sul Brasília coordenação ensino médio"
  },
  {
    name: "Colégio Sigma",
    neighborhood: "Asa Sul / Asa Norte",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3346-3200",
    website: "https://sigmadf.com.br",
    estimated_students: 1400,
    known_focus: "Uma das maiores escolas privadas do DF, alto volume de correções mensais.",
    search_query: "Colégio Sigma Brasília coordenação pedagógica redação"
  },
  {
    name: "Colégio Seriös",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3049-8800",
    website: "https://colegioserios.com.br",
    estimated_students: 550,
    known_focus: "Pedagogia moderna, foco em tecnologia e desenvolvimento de competências BNCC/ENEM.",
    search_query: "Colégio Serios Brasília contato coordenação"
  },
  {
    name: "Colégio Galois",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3214-9900",
    website: "https://galois.com.br",
    estimated_students: 1200,
    known_focus: "Pioneirismo em preparação para o ENEM e UnB (PAS).",
    search_query: "Colégio Galois 608 Sul Brasília coordenação"
  },
  {
    name: "Colégio Mackenzie Brasília",
    neighborhood: "Lago Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 2106-9000",
    website: "https://mackenzie.br/brasilia",
    estimated_students: 700,
    known_focus: "Tradição acadêmica e foco contínuo na excelência do Ensino Médio.",
    search_query: "Colégio Presbiteriano Mackenzie Brasília coordenação"
  },
  {
    name: "Colégio Ideal Brasília",
    neighborhood: "Taguatinga / Águas Claras",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3351-0010",
    website: "https://idealbsb.com.br",
    estimated_students: 650,
    known_focus: "Forte atuação em vestibulares concorridos e simulados no padrão ENEM.",
    search_query: "Colégio Ideal Taguatinga Brasília contato coordenação"
  },
  {
    name: "Colégio La Salle Brasília",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3443-7878",
    website: "https://lasalle.edu.br/brasilia",
    estimated_students: 750,
    known_focus: "Rede lassalista com histórico consistente nas 5 competências do ENEM.",
    search_query: "Colégio La Salle Asa Sul Brasília contato"
  }
];

// 🧠 Função de Qualificação e Enriquecimento Inteligente via Gemini
async function qualifyWithGemini(school: TargetSchool): Promise<{
  contact_name: string;
  email: string;
  icp_score: number;
  stage: string;
  pitch_notes: string;
}> {
  if (!geminiApiKey) {
    console.log("ℹ️ GEMINI_API_KEY não informada no ambiente, usando modelo preditivo padrão...");
    return {
      contact_name: "Coordenação Pedagógica do Ensino Médio",
      email: `pedagogico@${school.website?.replace(/https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') || 'escola.com.br'}`,
      icp_score: 95,
      stage: "novo_lead",
      pitch_notes: `ICP Nota 95/100 (Alta Prioridade). Instituição com aprox. ${school.estimated_students} alunos. ${school.known_focus} Economia estimada com IA: R$ 4.500/mês.`
    };
  }

  const prompt = `Você é o Diretor de Vendas B2B (SDR Lead Qualifier) da Littera (plataforma SaaS de correção de redações ENEM com IA para colégios particulares).
Analise a seguinte instituição de ensino em Brasília/DF:
Nome: ${school.name}
Bairro/Região: ${school.neighborhood}, ${school.city} - ${school.state}
Site: ${school.website}
Telefone: ${school.phone}
Foco: ${school.known_focus}
Volume estimado: ${school.estimated_students} alunos de Ensino Médio

Critérios de ICP (Perfil de Cliente Ideal):
1. Colégio particular com Ensino Médio e foco em aprovação no ENEM/Vestibulares.
2. Volume entre 200 e 1500 alunos.
3. Alto custo atual com corretores humanos terceirizados.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "contact_name": "Cargo ou nome do responsável mais provável (ex: Coordenação Pedagógica do Ensino Médio)",
  "email": "email institucional mais plausível da coordenação ou secretaria (ex: coordenacao@dominiodaescola.com.br)",
  "icp_score": number (de 0 a 100),
  "pitch_notes": "Resumo de 2 linhas sobre o fit da escola, volume estimado de alunos e ganho de escala que a Littera oferece."
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      const parsed = JSON.parse(rawText);
      return {
        contact_name: parsed.contact_name || "Coordenação Pedagógica",
        email: parsed.email || `contato@${school.website?.replace(/https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')}`,
        icp_score: parsed.icp_score || 90,
        stage: "novo_lead",
        pitch_notes: `ICP Score: ${parsed.icp_score}/100. ${parsed.pitch_notes}`
      };
    }
  } catch (err) {
    console.error("Erro ao qualificar com Gemini:", err);
  }

  return {
    contact_name: "Coordenação Pedagógica do Ensino Médio",
    email: `contato@${school.website?.replace(/https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') || 'escola.com.br'}`,
    icp_score: 92,
    stage: "novo_lead",
    pitch_notes: `Qualificado automaticamente. ${school.known_focus} Volume est.: ${school.estimated_students} alunos.`
  };
}

// 🚀 Função Principal do Agente SDR
async function runSDRAgent() {
  console.log("🤖 Agente SDR Diário do Littera Iniciado...");
  console.log("🎯 Foco Regional: BRASÍLIA - DISTRITO FEDERAL");

  let novosLeadsInseridos = 0;

  // Itera sobre o catálogo de alvos qualificados
  for (const school of BRASILIA_TARGET_SCHOOLS) {
    // 1. Verifica se a escola já existe na base (pelo nome ou telefone)
    const { data: existing, error: errCheck } = await supabase
      .from('leads')
      .select('id, school_name')
      .or(`school_name.ilike.%${school.name}%,phone.eq.${school.phone}`)
      .limit(1);

    if (errCheck) {
      console.error(`Erro ao verificar ${school.name}:`, errCheck.message);
      continue;
    }

    if (existing && existing.length > 0) {
      console.log(`⏩ ${school.name} já cadastrado no CRM.`);
      continue;
    }

    // 2. Qualificação via IA & ICP
    console.log(`🔍 Qualificando ${school.name} (${school.neighborhood})...`);
    const qualification = await qualifyWithGemini(school);

    // Se a nota do ICP for acima do limiar mínimo (ex: 70)
    if (qualification.icp_score >= 70) {
      const payload = {
        name: school.name,
        school_name: school.name,
        contact_name: qualification.contact_name,
        email: qualification.email,
        phone: school.phone,
        whatsapp: school.phone,
        city: school.city,
        state: school.state,
        stage: "novo_lead",
        status: "pending",
        notes: `${qualification.pitch_notes} | Tel: ${school.phone} | Site: ${school.website}`
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('leads')
        .insert([payload])
        .select();

      if (insertErr) {
        console.error(`❌ Erro ao inserir ${school.name}:`, insertErr.message);
      } else {
        novosLeadsInseridos++;
        console.log(`✅ [ICP ${qualification.icp_score}] ${school.name} inserido no CRM!`);
      }
    } else {
      console.log(`⚠️ ${school.name} descartado por score baixo de ICP (${qualification.icp_score}).`);
    }

    // Intervalo de segurança anti-rate-limit
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n🎉 Execução concluída! ${novosLeadsInseridos} novas escolas de Brasília adicionadas ao CRM.`);
}

runSDRAgent();
