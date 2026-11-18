import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltam credenciais do Supabase (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Interface de Escola Encontrada
interface TargetSchool {
  name: string;
  neighborhood?: string;
  city: string;
  state: string;
  phone: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  address?: string;
  known_focus?: string;
}

// 🌐 1. MOTOR GOOGLE PLACES API (NEW): Busca automática de Colégios e Cursinhos em Brasília
async function fetchSchoolsFromGooglePlaces(): Promise<TargetSchool[]> {
  if (!googlePlacesApiKey) {
    console.log("ℹ️ GOOGLE_PLACES_API_KEY não encontrada. Usando base curada.");
    return [];
  }

  console.log("📍 Consultando Google Places API (New) para escolas privadas de Ensino Médio em Brasília/DF...");

  const queries = [
    "colegio ensino medio brasilia df",
    "escola particular ensino medio asa sul brasilia",
    "escola particular ensino medio asa norte brasilia",
    "cursinho pre vestibular enem brasilia df",
    "colegio particular aguas claras df"
  ];

  const results: TargetSchool[] = [];
  const seenPlaceNames = new Set<string>();

  for (const textQuery of queries) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googlePlacesApiKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types"
        },
        body: JSON.stringify({
          textQuery: textQuery,
          languageCode: "pt-BR",
          maxResultCount: 8
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ Google Places retornou status ${response.status} para "${textQuery}":`, errorText.substring(0, 150));
        continue;
      }

      const data = await response.json();
      const places = data.places || [];

      for (const p of places) {
        const name = p.displayName?.text;
        if (!name || seenPlaceNames.has(name.toLowerCase())) continue;
        seenPlaceNames.add(name.toLowerCase());

        // Filtrar termos indesejados (faculdades, idiomas, creches, berçários)
        const lowerName = name.toLowerCase();
        if (
          lowerName.includes("infantil") ||
          lowerName.includes("creche") ||
          lowerName.includes("baby") ||
          lowerName.includes("idiomas") ||
          lowerName.includes("faculdade") ||
          lowerName.includes("universidade")
        ) {
          continue;
        }

        results.push({
          name: name,
          city: "Brasília",
          state: "DF",
          address: p.formattedAddress || "",
          phone: p.nationalPhoneNumber || p.internationalPhoneNumber || "(61) 3333-0000",
          website: p.websiteUri || "",
          rating: p.rating || 0,
          user_ratings_total: p.userRatingCount || 0,
          known_focus: `Encontrado no Google Maps (${p.rating ? p.rating + '★' : 'Sem nota'}). Endereço: ${p.formattedAddress || 'Brasília'}`
        });
      }
    } catch (err: any) {
      console.error(`Erro ao consultar Places para "${textQuery}":`, err.message);
    }

    // Intervalo de segurança
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`📍 Google Places API encontrou ${results.length} instituições candidatas.`);
  return results;
}

// 🏛️ Base de Escolas Particulares de Brasília (DF) de Alto Desempenho no ENEM e Ensino Médio
const BRASILIA_CURATED_SCHOOLS: TargetSchool[] = [
  {
    name: "Colégio Podion",
    neighborhood: "Asa Norte",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3340-0077",
    website: "https://podion.com.br",
    known_focus: "Foco intensivo em Medicina, vestibulares concorridos e nota 1000 no ENEM."
  },
  {
    name: "Colégio Olimpo Brasília",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3346-6000",
    website: "https://colegioolimpo.com.br",
    known_focus: "Referência tradicional em aprovações ENEM e olimpíadas do conhecimento."
  },
  {
    name: "Centro Educacional Leonardo da Vinci",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3214-2200",
    website: "https://leonardodavinci.com.br",
    known_focus: "Grande rede com múltiplas turmas de 1º a 3º ano do Ensino Médio."
  },
  {
    name: "Colégio Marista de Brasília",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3442-9400",
    website: "https://marista.edu.br/brasilia",
    known_focus: "Formação integral com forte produção textual e simulados regulares."
  },
  {
    name: "Colégio Sigma",
    neighborhood: "Asa Sul / Asa Norte",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3346-3200",
    website: "https://sigmadf.com.br",
    known_focus: "Uma das maiores escolas privadas do DF, alto volume de correções mensais."
  },
  {
    name: "Colégio Seriös",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3049-8800",
    website: "https://colegioserios.com.br",
    known_focus: "Pedagogia moderna, foco em tecnologia e desenvolvimento de competências BNCC/ENEM."
  },
  {
    name: "Colégio Galois",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3214-9900",
    website: "https://galois.com.br",
    known_focus: "Pioneirismo em preparação para o ENEM e UnB (PAS)."
  },
  {
    name: "Colégio Mackenzie Brasília",
    neighborhood: "Lago Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 2106-9000",
    website: "https://mackenzie.br/brasilia",
    known_focus: "Tradição acadêmica e foco contínuo na excelência do Ensino Médio."
  },
  {
    name: "Colégio Ideal Brasília",
    neighborhood: "Taguatinga / Águas Claras",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3351-0010",
    website: "https://idealbsb.com.br",
    known_focus: "Forte atuação em vestibulares concorridos e simulados no padrão ENEM."
  },
  {
    name: "Colégio La Salle Brasília",
    neighborhood: "Asa Sul",
    city: "Brasília",
    state: "DF",
    phone: "(61) 3443-7878",
    website: "https://lasalle.edu.br/brasilia",
    known_focus: "Rede lassalista com histórico consistente nas 5 competências do ENEM."
  }
];

// 🧠 2. QUALIFICAÇÃO INTELIGENTE DE ICP VIA GEMINI AI
async function qualifyWithGemini(school: TargetSchool): Promise<{
  contact_name: string;
  email: string;
  icp_score: number;
  stage: string;
  pitch_notes: string;
}> {
  const domain = school.website ? school.website.replace(/https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : 'escola.com.br';

  if (!geminiApiKey) {
    return {
      contact_name: "Coordenação Pedagógica do Ensino Médio",
      email: `pedagogico@${domain}`,
      icp_score: 92,
      stage: "novo_lead",
      pitch_notes: `Qualificado automaticamente. ${school.known_focus || 'Ensino Médio e ENEM'}.`
    };
  }

  const prompt = `Você é o Diretor de Vendas B2B da Littera (plataforma SaaS de correção instantânea de redações ENEM com IA para colégios particulares e cursinhos).
Analise a seguinte instituição de ensino encontrada em Brasília/DF:
Nome: ${school.name}
Endereço/Região: ${school.address || school.neighborhood || 'Brasília - DF'}
Site: ${school.website || 'Não informado'}
Telefone: ${school.phone}
Detalhes do Google Maps: ${school.known_focus || ''}

Critérios de ICP (Perfil de Cliente Ideal):
1. Colégio particular com Ensino Médio ou cursinho pré-vestibular focado em ENEM/UnB.
2. Volume estimado de redações e necessidade de reduzir custos com corretores terceirizados.
3. Descarte se for apenas berçário, pré-escola ou faculdade.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "is_fit": boolean,
  "contact_name": "Cargo ideal (ex: Coordenação Pedagógica do Ensino Médio ou Direção)",
  "email": "e-mail mais plausível (ex: contato@${domain} ou pedagogico@${domain})",
  "icp_score": number (de 0 a 100),
  "pitch_notes": "Resumo objetivo de 2 linhas sobre o fit, proposta de valor de redução de custo com banca e ganho de tempo pedagógico."
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
        email: parsed.email || `contato@${domain}`,
        icp_score: parsed.is_fit === false ? 40 : (parsed.icp_score || 90),
        stage: "novo_lead",
        pitch_notes: `ICP Score: ${parsed.icp_score || 90}/100. ${parsed.pitch_notes || ''}`
      };
    }
  } catch (err: any) {
    console.error("Erro na qualificação Gemini:", err.message);
  }

  return {
    contact_name: "Coordenação Pedagógica do Ensino Médio",
    email: `contato@${domain}`,
    icp_score: 90,
    stage: "novo_lead",
    pitch_notes: `Instituição de Brasília qualificada. Fit educacional ENEM.`
  };
}

// 🚀 3. EXECUÇÃO DO AGENTE SDR
async function runSDRAgent() {
  console.log("🤖 Agente SDR Diário do Littera Iniciado...");
  console.log("🎯 Foco Regional: BRASÍLIA - DISTRITO FEDERAL");

  // 1. Busca instituições pelo Google Places API (New)
  const placesSchools = await fetchSchoolsFromGooglePlaces();

  // 2. Combina com as escolas curadas de referência
  const allTargets: TargetSchool[] = [...BRASILIA_CURATED_SCHOOLS];
  for (const ps of placesSchools) {
    if (!allTargets.some(t => t.name.toLowerCase() === ps.name.toLowerCase())) {
      allTargets.push(ps);
    }
  }

  console.log(`📋 Total de ${allTargets.length} instituições para processar.`);

  let novosLeadsInseridos = 0;

  for (const school of allTargets) {
    // Verifica se já existe no CRM pelo nome
    const { data: existing, error: errCheck } = await supabase
      .from('leads')
      .select('id, school_name')
      .ilike('school_name', `%${school.name}%`)
      .limit(1);

    if (errCheck) {
      console.error(`Erro ao verificar ${school.name}:`, errCheck.message);
      continue;
    }

    if (existing && existing.length > 0) {
      console.log(`⏩ ${school.name} já cadastrado no CRM.`);
      continue;
    }

    // Qualifica o lead com IA
    console.log(`🔍 Qualificando com IA: ${school.name}...`);
    const qualification = await qualifyWithGemini(school);

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
        notes: `${qualification.pitch_notes} | Tel: ${school.phone}${school.website ? ' | Site: ' + school.website : ''}`
      };

      const { error: insertErr } = await supabase
        .from('leads')
        .insert([payload]);

      if (insertErr) {
        console.error(`❌ Erro ao salvar ${school.name}:`, insertErr.message);
      } else {
        novosLeadsInseridos++;
        console.log(`✅ [ICP ${qualification.icp_score}] ${school.name} inserido no CRM!`);
      }
    } else {
      console.log(`⚠️ ${school.name} descartado por não atender ao ICP (Score ${qualification.icp_score}).`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🎉 Execução finalizada! ${novosLeadsInseridos} novos leads de Brasília foram adicionados ao CRM.`);
}

runSDRAgent();
