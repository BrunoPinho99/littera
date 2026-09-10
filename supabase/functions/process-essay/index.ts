import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'
import { Receiver } from 'https://esm.sh/@upstash/qstash@2.7.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const extractJson = (str: string): string => {
  if (!str) return "{}"
  let cleaned = str.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  return cleaned
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Falta cabeçalho de Autorização (JWT).' }, 401)
    }

    const currentSigningKey = Deno.env.get('QSTASH_CURRENT_SIGNING_KEY')
    const nextSigningKey = Deno.env.get('QSTASH_NEXT_SIGNING_KEY')
    
    // Se as chaves do QStash estiverem presentes, validar a origem da requisição
    if (currentSigningKey && nextSigningKey) {
      const signature = req.headers.get('upstash-signature')
      if (!signature) {
        return jsonResponse({ error: 'Assinatura QStash ausente.' }, 401)
      }
      
      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
      })
      
      const rawBody = await req.clone().text()
      const isValid = await receiver.verify({
        signature,
        body: rawBody,
      }).catch(err => {
        console.error("[process-essay] Erro na verificação do QStash:", err);
        return false;
      })
      
      if (!isValid) {
        return jsonResponse({ error: 'Assinatura QStash inválida.' }, 401)
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // Usamos o SERVICE_ROLE_KEY aqui para garantir que possamos atualizar a redação
    // mesmo que o JWT do usuário expire durante o processamento longo, mas como
    // repassamos o AuthHeader do usuário, também podemos usar supabaseAnonKey + authHeader.
    // Vamos usar SERVICE_ROLE_KEY para a escrita por segurança de background job.
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) {
      console.error('[process-essay] GEMINI_API_KEY não configurada no Supabase Secrets.')
      return jsonResponse({ error: 'Erro de configuração do servidor.' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const body = await req.json()
    const { essayId, topicTitle, input } = body

    if (!essayId || !topicTitle || !input) {
      return jsonResponse({ error: 'Faltam parâmetros obrigatórios.' }, 400)
    }

    // Chamar Gemini API
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { 
        temperature: 0.15,
        responseMimeType: "application/json"
      },
    })

    const isTextInput = input.type === "text"
    const essayContent = isTextInput ? input.content : null

    const systemPrompt = `
Você é um corretor OFICIAL de redações do ENEM, seguindo rigorosamente a Matriz de Referência do INEP (Cartilha do Participante). Corrija a redação sobre o tema: "${topicTitle}".

═══════════════════════════════════════════════════
REGRAS DE NOTA ZERO (verificar ANTES de corrigir):
═══════════════════════════════════════════════════
- Texto com menos de 7 linhas (excluindo título): totalScore = 0, zeroReason = "Texto insuficiente (menos de 7 linhas)"
- Fuga TOTAL ao tema proposto: totalScore = 0, zeroReason = "Fuga ao tema"
- Cópia integral dos textos motivadores: totalScore = 0, zeroReason = "Cópia dos textos motivadores"
- Texto que não é dissertativo-argumentativo (poema, narração, carta): totalScore = 0, zeroReason = "Não atende ao tipo textual"
- Texto ilegível ou em língua estrangeira: totalScore = 0, zeroReason = "Texto ilegível"
- Folha em branco: totalScore = 0, zeroReason = "Folha em branco"
Se NENHUMA regra de zero se aplicar, zeroReason = null.

═══════════════════════════════════════════════════
COMPETÊNCIA 1 — Domínio da norma culta da Língua Portuguesa
═══════════════════════════════════════════════════
Avalie: ortografia, acentuação, concordância verbal/nominal, regência verbal/nominal, pontuação, flexão, estrutura sintática, crase, uso de pronomes.
- 200 (Excelente): Desvios gramaticais apenas como excepcionalidade, sem prejudicar a fluidez.
- 160 (Bom): Poucos desvios gramaticais e de convenções da escrita.
- 120 (Mediano): Alguns desvios gramaticais e de convenções da escrita.
- 80 (Insuficiente): Muitos desvios gramaticais, prejudicando a compreensão parcialmente.
- 40 (Precário): Desvios muito frequentes e sistemáticos que comprometem a compreensão.
- 0: Desconhecimento total da norma culta.

═══════════════════════════════════════════════════
COMPETÊNCIA 2 — Compreensão da proposta e tipo textual
═══════════════════════════════════════════════════
Avalie: adequação ao tema, tipo dissertativo-argumentativo, uso de repertório sociocultural produtivo (citações, dados, referências históricas/filosóficas/culturais), desenvolvimento do ponto de vista.
- 200: Tema desenvolvido com excelência + repertório sociocultural produtivo e diversificado.
- 160: Bom desenvolvimento + repertório sociocultural produtivo.
- 120: Desenvolvimento mediano + repertório previsível (senso comum).
- 80: Tangenciamento ao tema ou repertório não legitimado.
- 40: Desenvolvimento precário, sem repertório.
- 0: Fuga ao tema ou não é dissertativo-argumentativo.

═══════════════════════════════════════════════════
COMPETÊNCIA 3 — Seleção e organização de argumentos
═══════════════════════════════════════════════════
Avalie: seleção de fatos/opiniões, organização lógica, relação entre tese e argumentos, profundidade da argumentação, ausência de contradições.
- 200: Argumentação excelente, com informações, fatos e opiniões bem articulados em defesa de um ponto de vista consistente.
- 160: Boa argumentação com informações e opiniões relacionadas ao tema.
- 120: Argumentação mediana, com algumas incoerências ou contradições.
- 80: Argumentação insuficiente, pouco organizada ou com muitas contradições.
- 40: Argumentação precária, sem relação clara com o tema.
- 0: Sem defesa de ponto de vista.

═══════════════════════════════════════════════════
COMPETÊNCIA 4 — Coesão textual
═══════════════════════════════════════════════════
Avalie: uso de conectivos (mas, porém, portanto, além disso, etc.), referenciação (pronomes, sinônimos), progressão temática entre parágrafos, articulação entre introdução/desenvolvimento/conclusão.
- 200: Excelente articulação, conectivos diversificados e bem empregados em todo o texto.
- 160: Boa articulação com poucas inadequações.
- 120: Articulação mediana, repertório limitado de conectivos ou uso inadequado.
- 80: Articulação insuficiente, parágrafos desconexos.
- 40: Articulação precária, ausência quase total de mecanismos coesivos.
- 0: Sem articulação entre as partes.

═══════════════════════════════════════════════════
COMPETÊNCIA 5 — Proposta de intervenção
═══════════════════════════════════════════════════
A proposta DEVE conter os 5 elementos (cada um vale ~40 pontos):
1. AGENTE (Quem?) — ex: Governo Federal, MEC, Mídia, Escola, Família, ONGs
2. AÇÃO (O que?) — medida prática e concreta
3. MODO/MEIO (Como?) — por meio de quê (campanhas, leis, projetos, etc.)
4. EFEITO/FINALIDADE (Para quê?) — objetivo esperado
5. DETALHAMENTO — informação adicional que amplia um dos elementos anteriores
ATENÇÃO: Proposta que fere os Direitos Humanos = 0 pontos.
- 200: Proposta completa (5 elementos) + detalhada + articulada ao tema.
- 160: Proposta com 4 elementos bem articulados.
- 120: Proposta com 3 elementos.
- 80: Proposta com 2 elementos, vaga.
- 40: Proposta com 1 elemento, genérica.
- 0: Sem proposta ou fere Direitos Humanos.

═══════════════════════════════════════════════════
INSTRUÇÕES DE RESPOSTA
═══════════════════════════════════════════════════
Responda EXCLUSIVAMENTE no JSON abaixo. NÃO inclua texto fora do JSON.
Cada nota DEVE ser múltiplo de 40 (0, 40, 80, 120, 160 ou 200).
totalScore = soma das 5 notas.
O campo "feedback" de cada competência deve ter 2-4 frases detalhadas.
O campo "tips" deve ter 2-3 dicas PRÁTICAS e ACIONÁVEIS para o aluno melhorar.
O campo "errors" deve listar 1-3 erros ESPECÍFICOS encontrados no texto (com trecho original e correção sugerida). Se não houver erros relevantes para aquela competência, use array vazio.
O campo "generalComment" deve ter 3-5 frases: pontos fortes + pontos de melhoria + motivação.
O campo "strengths" deve listar 2-3 pontos FORTES do texto.
O campo "priorityImprovements" deve listar 2-3 PRIORIDADES de melhoria.
${isTextInput ? 'O campo "annotations" deve conter marcações no texto do aluno com posição (start/end em caracteres, 0-indexed) e tipo do problema. Máximo 10 annotations. Use APENAS posições que existam no texto original.' : 'O campo "annotations" deve ser um array vazio [] pois o texto é manuscrito.'}

{
  "totalScore": <soma das 5 competências>,
  "zeroReason": <string ou null>,
  "generalComment": "<3-5 frases: fortes + melhorias + motivação>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>"],
  "priorityImprovements": ["<melhoria 1>", "<melhoria 2>"],
  "competencies": [
    {
      "name": "Competência 1 – Domínio da norma culta",
      "score": <0|40|80|120|160|200>,
      "level": "<Excelente|Bom|Mediano|Insuficiente|Precário|Desconhecimento>",
      "feedback": "<2-4 frases detalhadas>",
      "tips": ["<dica 1>", "<dica 2>"],
      "errors": [{"excerpt": "<trecho com erro>", "correction": "<como deveria ser>", "type": "<tipo do erro>"}]
    },
    {
      "name": "Competência 2 – Compreensão da proposta",
      "score": <0|40|80|120|160|200>,
      "level": "<nível>",
      "feedback": "<2-4 frases>",
      "tips": ["<dica>"],
      "errors": []
    },
    {
      "name": "Competência 3 – Argumentação",
      "score": <0|40|80|120|160|200>,
      "level": "<nível>",
      "feedback": "<2-4 frases>",
      "tips": ["<dica>"],
      "errors": []
    },
    {
      "name": "Competência 4 – Coesão textual",
      "score": <0|40|80|120|160|200>,
      "level": "<nível>",
      "feedback": "<2-4 frases>",
      "tips": ["<dica>"],
      "errors": [{"excerpt": "<trecho>", "correction": "<sugestão>", "type": "coesão"}]
    },
    {
      "name": "Competência 5 – Proposta de intervenção",
      "score": <0|40|80|120|160|200>,
      "level": "<nível>",
      "feedback": "<2-4 frases>",
      "tips": ["<dica>"],
      "errors": []
    }
  ],
  "annotations": [
    {"start": <int>, "end": <int>, "type": "<grammar|cohesion|argument|vocabulary|punctuation>", "message": "<mensagem curta>"}
  ]
}
`
    let requestContent: any
    let isHandwritten = false

    if (input.type === "text") {
      requestContent = systemPrompt + `\n\nREDAÇÃO DO ALUNO:\n${input.content}`
    } else {
      isHandwritten = true
      const base64Data = input.base64?.includes(",") ? input.base64.split(",")[1] : input.base64 || ""
      requestContent = {
        contents: [{
          role: "user",
          parts: [
            { text: systemPrompt + "\n\nA redação está na imagem a seguir:" },
            { inlineData: { mimeType: input.mimeType || "image/jpeg", data: base64Data } },
          ],
        }],
      }
    }

    console.log(`[process-essay] Chamando Gemini para redação ${essayId}...`)
    const result = await model.generateContent(requestContent)
    const text = result.response.text()
    
    let parsed: any;
    try {
      parsed = JSON.parse(extractJson(text))
    } catch (e) {
      console.error(`[process-essay] Erro ao fazer parse do JSON do Gemini para redação ${essayId}:`, text)
      // Atualizar status para erro
      await supabase.from('redacoes').update({
        status: 'erro',
        comentario_geral: 'Falha ao processar a resposta da IA. Tente enviar novamente.'
      }).eq('id', essayId)
      
      return jsonResponse({ error: 'Erro no parse do Gemini.' }, 500)
    }
    
    parsed.aiDetected = false
    parsed.aiJustification = ""

    if (typeof parsed.totalScore !== "number" || !Array.isArray(parsed.competencies)) {
      console.error(`[process-essay] Formato inesperado do Gemini para redação ${essayId}:`, parsed)
      
      await supabase.from('redacoes').update({
        status: 'erro',
        comentario_geral: 'A inteligência artificial retornou um formato inesperado. Tente enviar novamente.'
      }).eq('id', essayId)

      return jsonResponse({ error: "Resposta da IA em formato inesperado." }, 500)
    }

    // Atualizar redação no Supabase Database
    const updatePayload: Record<string, any> = {
      total_score: parsed.totalScore,
      status: 'corrigida',
      competencias_json: JSON.stringify(parsed.competencies),
      comentario_geral: parsed.generalComment || '',
    }

    // Salvar novos campos se existirem
    if (parsed.strengths) updatePayload.strengths_json = JSON.stringify(parsed.strengths)
    if (parsed.priorityImprovements) updatePayload.improvements_json = JSON.stringify(parsed.priorityImprovements)
    if (parsed.annotations) updatePayload.annotations_json = JSON.stringify(parsed.annotations)
    if (parsed.zeroReason) updatePayload.zero_reason = parsed.zeroReason

    const { error: updateError } = await supabase.from('redacoes').update(updatePayload).eq('id', essayId)

    if (updateError) {
      console.error(`[process-essay] Erro ao atualizar redação ${essayId}:`, updateError)
      return jsonResponse({ error: 'Erro ao atualizar banco de dados.' }, 500)
    }

    console.log(`[process-essay] Redação ${essayId} corrigida com sucesso! Score: ${parsed.totalScore}`)
    return jsonResponse({ success: true, essayId })

  } catch (error: any) {
    console.error("[process-essay] Erro geral:", error)
    return jsonResponse({ error: error.message || 'Erro interno do servidor.' }, 500)
  }
})

