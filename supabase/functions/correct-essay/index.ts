import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.1'

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

// Extrai JSON seguro da resposta do Gemini
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
  // CORS Preflight
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) {
      console.error('[correct-essay] GEMINI_API_KEY não configurada no Supabase Secrets.')
      return jsonResponse({ error: 'Erro de configuração do servidor.' }, 500)
    }

    // Cria cliente Supabase autenticado como o usuário da requisição
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // 1. Extrair ID do usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[correct-essay] Token inválido:', authError)
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401)
    }
    const studentId = user.id

    const body = await req.json()
    const { topicTitle, input, classId, schoolId } = body

    if (!topicTitle || !input) {
      return jsonResponse({ error: 'Faltam parâmetros obrigatórios (topicTitle, input).' }, 400)
    }

    // 2. Checar Limits (is_trial e limite de 2 redações) via RPC
    const { data: canSend, error: rpcError } = await supabase.rpc('check_essay_limit', { p_student_id: studentId })
    
    if (rpcError) {
      console.error('[correct-essay] Erro ao checar limite:', rpcError)
      return jsonResponse({ error: 'Erro ao validar limites de envio.' }, 500)
    }

    if (canSend === false) {
      return jsonResponse({ 
        error: 'Limite Atingido', 
        message: 'Você atingiu o limite de 2 redações hoje ou seu período de teste (15 dias) expirou. Assine o plano completo ou volte amanhã.' 
      }, 403)
    }

    // 3. Chamar Gemini API
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

    const result = await model.generateContent(requestContent)
    const text = result.response.text()
    const parsed = JSON.parse(extractJson(text))
    
    parsed.aiDetected = false
    parsed.aiJustification = ""

    if (typeof parsed.totalScore !== "number" || !Array.isArray(parsed.competencies)) {
      throw new Error("Resposta da IA em formato inesperado.")
    }

    // 4. Salvar redação no Supabase Database
    const essayToSave = {
      tema: topicTitle,
      conteudo: isHandwritten ? '[Manuscrito Base64]' : input.content,
      score: parsed.totalScore,
      data_envio: new Date().toISOString(),
      student_id: studentId,
      student_name: user.user_metadata?.full_name || 'Estudante',
      class_id: classId || user.user_metadata?.class_id || null,
      school_id: schoolId || user.user_metadata?.school_id || null,
      status: 'corrigida',
      result: parsed
    }

    const { error: insertError } = await supabase.from('saved_essays').insert(essayToSave)

    if (insertError) {
      console.error('[correct-essay] Erro ao salvar redação:', insertError)
      // Retorna a correção mesmo que o salvamento falhe, pois o custo do Gemini já foi pago, 
      // mas seria ideal logar isso criticamente
    }

    // 5. Retornar resposta ao frontend
    return jsonResponse(parsed)

  } catch (error: any) {
    console.error("[correct-essay] Erro geral:", error)
    return jsonResponse({ error: error.message || 'Erro interno do servidor.' }, 500)
  }
})
