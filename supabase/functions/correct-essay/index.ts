import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

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

    // 3. Salvar redação no Supabase Database com status 'processando'
    const isHandwritten = input.type !== "text";
    const essayToSave = {
      tema: topicTitle,
      conteudo: isHandwritten ? '[Manuscrito Base64]' : input.content,
      total_score: 0,
      data_envio: new Date().toISOString(),
      user_id: studentId,
      student_name: user.user_metadata?.full_name || 'Estudante',
      class_id: classId || user.user_metadata?.class_id || null,
      school_id: schoolId || user.user_metadata?.school_id || null,
      status: 'processando',
      competencias_json: '[]',
      comentario_geral: '',
      user_metadata: JSON.stringify(user.user_metadata || {}),
    }

    const { data: insertedEssay, error: insertError } = await supabase
      .from('redacoes')
      .insert(essayToSave)
      .select('id')
      .single()

    if (insertError || !insertedEssay) {
      console.error('[correct-essay] Erro ao salvar redação:', insertError)
      return jsonResponse({ error: 'Erro ao criar registro da redação.' }, 500)
    }

    // 4. Disparar processamento em background via Fila (QStash) ou direto
    const processUrl = `${supabaseUrl}/functions/v1/process-essay`;
    const qstashToken = Deno.env.get('QSTASH_TOKEN');
    
    if (qstashToken) {
      // QStash Queue
      const qstashUrl = `https://qstash.upstash.io/v2/publish/${processUrl}`;
      fetch(qstashUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${qstashToken}`,
          'Content-Type': 'application/json',
          'Upstash-Forward-Authorization': authHeader,
          // Upstash-Retries controla o Circuit Breaker/Retries
          'Upstash-Retries': '3', 
        },
        body: JSON.stringify({
          essayId: insertedEssay.id,
          topicTitle,
          input,
        })
      }).catch(err => console.error('[correct-essay] Erro ao enviar para QStash:', err));
    } else {
      // Fallback sem fila (risco de Rate Limit no Gemini)
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          essayId: insertedEssay.id,
          topicTitle,
          input,
        })
      }).catch(err => console.error('[correct-essay] Erro ao disparar process-essay:', err));
    }

    // 5. Retornar resposta imediata ao frontend com o ID
    return jsonResponse({ success: true, essayId: insertedEssay.id })

  } catch (error: any) {
    console.error("[correct-essay] Erro geral:", error)
    return jsonResponse({ error: error.message || 'Erro interno do servidor.' }, 500)
  }
})
