import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'
import { Receiver } from 'https://esm.sh/@upstash/qstash@2.7.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://app.littera.com.br',
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
        temperature: 0.2,
        responseMimeType: "application/json"
      },
    })

    const systemPrompt = `
Você é um corretor oficial do ENEM. Corrija a redação sobre: "${topicTitle}".
Avalie pelas 5 competências do ENEM (cada uma de 0 a 200, múltiplos de 40).
Responda seguindo o schema abaixo:
{
  "totalScore": <soma>,
  "aiDetected": false,
  "aiJustification": "",
  "generalComment": "<análise geral em 2 frases>",
  "competencies": [
    { "name": "Competência 1 – Domínio da norma culta", "score": <0-200>, "feedback": "..." },
    { "name": "Competência 2 – Compreensão da proposta", "score": <0-200>, "feedback": "..." },
    { "name": "Competência 3 – Argumentação", "score": <0-200>, "feedback": "..." },
    { "name": "Competência 4 – Coesão textual", "score": <0-200>, "feedback": "..." },
    { "name": "Competência 5 – Proposta de intervenção", "score": <0-200>, "feedback": "..." }
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
    const { error: updateError } = await supabase.from('redacoes').update({
      total_score: parsed.totalScore,
      status: 'corrigida',
      competencias_json: JSON.stringify(parsed.competencies),
      comentario_geral: parsed.generalComment || '',
    }).eq('id', essayId)

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
