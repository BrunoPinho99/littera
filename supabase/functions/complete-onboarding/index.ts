// supabase/functions/complete-onboarding/index.ts
// Edge Function — Finaliza o onboarding criando a escola para usuário autenticado (sempre com status 'inactive' até confirmação do Asaas)
import { createClient } from '@supabase/supabase-js'

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Configuração de banco ausente.' }, 500)
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Não autorizado. Use o fluxo /cadastro para criar sua conta.' }, 401)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !callerUser) {
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401)
    }

    const body = await req.json()
    const { email, directorName, schoolName, cnpj, studentCount, asaasCustomerId, subscriptionId } = body
    const normalizedEmail = (email || callerUser.email || '').toLowerCase().trim()

    if (!normalizedEmail || !schoolName || !cnpj) {
      return jsonResponse({ error: 'Dados insuficientes para criar a conta.' }, 400)
    }

    const isLitteraAdmin = callerUser.app_metadata?.role === 'littera_admin'
    if (!isLitteraAdmin && callerUser.email?.toLowerCase() !== normalizedEmail) {
      return jsonResponse({ error: 'E-mail divergente do usuário autenticado.' }, 403)
    }

    // Impedir duplicação ou sequestro por CNPJ
    const cleanCnpj = String(cnpj).replace(/\D/g, '')
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('id')
      .eq('cnpj', cleanCnpj)
      .maybeSingle()

    if (existingSchool) {
      return jsonResponse({ error: 'Já existe uma instituição cadastrada com este CNPJ.' }, 409)
    }

    const userId = callerUser.id

    // Impedir que um usuário que já pertence a uma escola crie outra por esta rota
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile?.school_id) {
      return jsonResponse({ error: 'Usuário já vinculado a uma instituição.' }, 409)
    }

    const slug = String(schoolName)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    // Criar Escola sempre como 'inactive' — apenas o webhook Asaas ou admin autorizado ativa
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: String(schoolName).trim(),
        slug: slug || `escola-${Date.now()}`,
        cnpj: cleanCnpj,
        email: normalizedEmail,
        student_count: studentCount,
        asaas_customer_id: asaasCustomerId || null,
        subscription_id: subscriptionId || null,
        subscription_status: 'inactive',
      })
      .select()
      .single()

    if (schoolError || !schoolData) {
      console.error('School error:', schoolError)
      return jsonResponse({ error: 'Erro ao registrar escola no banco de dados.' }, 500)
    }

    await supabase.from('profiles').upsert({
      id: userId,
      full_name: directorName || callerUser.user_metadata?.full_name || normalizedEmail,
      email: normalizedEmail,
      role: 'owner',
      school_id: schoolData.id,
      status: 'active',
    })

    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: directorName || callerUser.user_metadata?.full_name || normalizedEmail,
        user_type: 'school_admin',
        school_id: schoolData.id,
      },
    })

    return jsonResponse({ success: true, schoolId: schoolData.id })

  } catch (err: unknown) {
    console.error('Complete onboarding error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return jsonResponse({ error: message }, 500)
  }
})
