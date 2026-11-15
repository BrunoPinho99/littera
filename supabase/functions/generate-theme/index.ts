import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai'

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

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Falta cabeçalho de Autorização (JWT).' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) {
      return jsonResponse({ error: 'Erro de configuração.' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401)
    }

    // Anti-spam simples por usuário (mínimo 10 segundos entre gerações de tema)
    const userLastReq = ((globalThis as unknown as { _userLastThemeGen?: Map<string, number> })._userLastThemeGen) || new Map<string, number>();
    (globalThis as unknown as { _userLastThemeGen?: Map<string, number> })._userLastThemeGen = userLastReq;

    const lastTime = userLastReq.get(user.id);
    const now = Date.now();
    if (lastTime && now - lastTime < 10000) {
      const waitSecs = Math.ceil((10000 - (now - lastTime)) / 1000);
      return jsonResponse({
        error: 'Limite de Requisições (Anti-Spam)',
        message: `Por favor, aguarde ${waitSecs} segundo(s) antes de solicitar a geração de um novo tema com IA.`
      }, 429);
    }
    userLastReq.set(user.id, now);

    const body = await req.json()
    const { action, prompt } = body

    const genAI = new GoogleGenerativeAI(geminiKey)
    const generationConfig: GenerationConfig & { thinkingConfig?: { thinkingBudget: number } } = {
      temperature: 0.7,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    }
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig,
    })

    if (action === 'generateCustomTopic') {
      const p = `
        Crie um tema de redação para o ENEM sobre: "${prompt}".
        Responda seguindo exatamente esta estrutura:
        {
          "title": "Título Completo do Tema",
          "supportTexts": [
            { "id": "1", "title": "Texto 1", "content": "Resumo...", "icon": "article" }
          ]
        }
      `;
      const result = await model.generateContent(p)
      return jsonResponse(JSON.parse(extractJson(result.response.text())))
    }

    if (action === 'generateAssignmentTheme') {
      const p = `
        Crie um tema de redação para alunos do ensino médio com base no seguinte assunto: "${prompt}".
        Retorne APENAS um objeto JSON (sem markdown ou code blocks):
        {
          "title": "Título do Tema (estilo ENEM criativo)",
          "baseText": "Texto de apoio motivador com cerca de 2 parágrafos."
        }
      `;
      const result = await model.generateContent(p)
      return jsonResponse(JSON.parse(extractJson(result.response.text())))
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno."
    return jsonResponse({ error: message }, 500)
  }
})
