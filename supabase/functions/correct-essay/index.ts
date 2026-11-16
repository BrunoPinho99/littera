import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

async function computeSha256Hex(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Extrai JSON seguro da resposta do Gemini
const _extractJson = (str: string): string => {
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
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiKey) {
      console.error('[correct-essay] GEMINI_API_KEY não configurada no Supabase Secrets.')
      return jsonResponse({ error: 'Erro de configuração do servidor.' }, 500)
    }

    const body = await req.json()
    const { topicTitle, input, classId, schoolId, demo_mode } = body

    if (!topicTitle || !input) {
      return jsonResponse({ error: 'Faltam parâmetros obrigatórios (topicTitle, input).' }, 400)
    }

    let studentId: string | null = null
    let studentName: string
    let supabase: SupabaseClient
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    let userMetadata: Record<string, unknown> = {}
    let resolvedClassId = classId || null
    let resolvedSchoolId = schoolId || null

    if (demo_mode) {
      // ── MODO DEMO: sem JWT, usa service role com rate-limit global por hora ──
      studentId = null
      studentName = 'Estudante Demo'
      resolvedClassId = null
      resolvedSchoolId = null
      supabase = supabaseAdmin

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: demoCount, error: demoCountError } = await supabaseAdmin
        .from('redacoes')
        .select('id', { count: 'exact', head: true })
        .is('user_id', null)
        .in('status', ['processando', 'corrigida'])
        .gte('data_envio', oneHourAgo)

      if (!demoCountError && (demoCount ?? 0) >= 10) {
        return jsonResponse(
          {
            error: 'Limite Demo Atingido',
            message: 'O modo demonstração atingiu o limite temporário de correções por hora. Crie uma conta ou tente novamente em instantes.',
          },
          429
        )
      }
    } else {
      // ── MODO NORMAL: requer JWT ──
      if (!authHeader) {
        return jsonResponse({ error: 'Falta cabeçalho de Autorização (JWT).' }, 401)
      }

      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('[correct-essay] Token inválido:', authError)
        return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401)
      }

      studentId = user.id
      userMetadata = user.user_metadata || {}

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, class_id, full_name')
        .eq('id', user.id)
        .maybeSingle()

      studentName = (user.user_metadata?.full_name as string) || profile?.full_name || 'Estudante'
      resolvedSchoolId = profile?.school_id || (user.user_metadata?.school_id as string) || schoolId || null
      resolvedClassId = profile?.class_id || classId || (user.user_metadata?.class_id as string) || null
    }

    // 1. Calcular hash SHA-256 do payload (base64 da imagem ou texto)
    const rawPayload = input.type === 'text'
      ? (input.content || '').trim()
      : (input.base64?.includes(',') ? input.base64.split(',')[1] : (input.base64 || '')).trim()
    if (!rawPayload) {
      return jsonResponse({ error: 'Conteúdo da redação vazio.' }, 400)
    }
    const imageHash = await computeSha256Hex(rawPayload)

    // 2. Deduplicação: verificar se a mesma redação já foi enviada para este tema
    if (!demo_mode && imageHash) {
      const { data: existingEssay } = await supabase
        .from('redacoes')
        .select('id, status')
        .eq('user_id', studentId)
        .eq('tema', topicTitle)
        .eq('image_hash', imageHash)
        .in('status', ['processando', 'corrigida'])
        .order('data_envio', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingEssay?.id) {
        console.log(`[correct-essay] Redação duplicada detectada (hash=${imageHash.slice(0, 12)}...). Retornando cache: ${existingEssay.id}`)
        return jsonResponse({
          success: true,
          essayId: existingEssay.id,
          cached: true,
        })
      }
    }

    // 2.5. Checar limites (cooldown 10min, teto diário 3/dia, pool mensal da escola e trial) via RPC
    if (!demo_mode) {
      const { data: quotaResult, error: rpcError } = await supabase.rpc(
        'check_and_reserve_essay_quota',
        {
          p_student_id: studentId,
          p_school_id: resolvedSchoolId,
        } as Record<string, unknown>
      )

      if (rpcError) {
        console.error('[correct-essay] Erro ao checar cota de envio:', rpcError)
        return jsonResponse({ error: 'Erro ao validar limites de envio.' }, 500)
      }

      const quota = (quotaResult || {}) as { allowed?: boolean; reason?: string }
      if (quota.allowed === false) {
        const reasonMessages: Record<string, string> = {
          COOLDOWN: 'Aguarde 10 minutos entre o envio de uma redação e outra para enviar uma nova foto.',
          DAILY_LIMIT: 'Você atingiu o limite diário de redações enviadas hoje. Volte amanhã para continuar praticando!',
          SCHOOL_QUOTA_EXCEEDED: 'A franquia mensal de correções da sua escola foi atingida. Comunique a coordenação da sua instituição.',
          TRIAL_EXPIRED: 'Seu período de teste gratuito expirou. Peça para sua escola ativar o plano completo do Littera.',
        }
        const reason = quota.reason || 'DAILY_LIMIT'
        return jsonResponse(
          {
            error: 'Limite Atingido',
            reason,
            message: reasonMessages[reason] || 'Limite de envio atingido.',
          },
          403
        )
      }
    }

    // 3. Salvar redação no Supabase Database com status 'processando'
    const isHandwritten = input.type !== "text";
    const essayToSave = {
      tema: topicTitle,
      conteudo: isHandwritten ? '[Manuscrito Base64]' : input.content,
      total_score: 0,
      data_envio: new Date().toISOString(),
      user_id: demo_mode ? null : studentId,
      student_name: studentName,
      class_id: resolvedClassId,
      school_id: resolvedSchoolId,
      status: 'processando',
      competencias_json: '[]',
      comentario_geral: '',
      user_metadata: JSON.stringify(userMetadata),
      image_hash: imageHash,
    }

    const { data: insertedEssay, error: insertError } = await supabase
      .from('redacoes')
      .insert(essayToSave as Record<string, unknown>)
      .select('id')
      .single()

    if (insertError || !insertedEssay) {
      console.error('[correct-essay] Erro ao salvar redação:', insertError)
      return jsonResponse({ error: 'Erro ao criar registro da redação.' }, 500)
    }

    const essayId = (insertedEssay as Record<string, unknown>).id as string

    // 4. Disparar processamento em background via Fila (QStash) ou direto
    const processUrl = `${supabaseUrl}/functions/v1/process-essay`;
    const qstashToken = Deno.env.get('QSTASH_TOKEN');
    const serviceAuthHeader = `Bearer ${supabaseServiceKey}`;

    const markEssayError = async (reason: string) => {
      await supabaseAdmin
        .from('redacoes')
        .update({ status: 'erro', comentario_geral: reason })
        .eq('id', essayId);
    };

    const dispatchPromise = qstashToken
      ? fetch(`https://qstash.upstash.io/v2/publish/${processUrl}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${qstashToken}`,
            'Content-Type': 'application/json',
            'Upstash-Forward-Authorization': serviceAuthHeader,
            'Upstash-Retries': '3',
          },
          body: JSON.stringify({
            essayId,
            topicTitle,
            input,
          })
        }).then(async (res) => {
          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.error(`[correct-essay] QStash retornou ${res.status}:`, errText);
            await markEssayError('Falha ao enfileirar redação para correção. Tente novamente.');
          }
        }).catch(async (err) => {
          console.error('[correct-essay] Erro ao enviar para QStash:', err);
          await markEssayError('Falha de comunicação com a fila de correção. Tente novamente.');
        })
      : fetch(processUrl, {
          method: 'POST',
          headers: {
            'Authorization': serviceAuthHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            essayId,
            topicTitle,
            input,
          })
        }).then(async (res) => {
          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.error(`[correct-essay] process-essay retornou ${res.status}:`, errText);
            await markEssayError('Falha ao processar a correção da redação. Tente novamente.');
          }
        }).catch(async (err) => {
          console.error('[correct-essay] Erro ao disparar process-essay:', err);
          await markEssayError('Falha de comunicação ao iniciar a correção. Tente novamente.');
        });

    const edgeRuntime = (globalThis as unknown as {
      EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void }
    }).EdgeRuntime;

    if (edgeRuntime && typeof edgeRuntime.waitUntil === 'function') {
      edgeRuntime.waitUntil(dispatchPromise);
    } else {
      await dispatchPromise;
    }

    // 5. Retornar resposta imediata ao frontend com o ID
    return jsonResponse({ success: true, essayId })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.'
    console.error("[correct-essay] Erro geral:", error)
    return jsonResponse({ error: message }, 500)
  }
})
