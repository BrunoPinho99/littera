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

    const body = await req.json()
    const { action, prompt } = body

    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
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
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500)
  }
})
