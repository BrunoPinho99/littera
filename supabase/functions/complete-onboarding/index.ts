// supabase/functions/complete-onboarding/index.ts
// Edge Function — Finaliza o onboarding criando a conta do usuário após o pagamento
import { createClient } from 'npm:@supabase/supabase-js@2'

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

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.json()
    const { email, password, directorName, schoolName, cnpj, studentCount, asaasCustomerId, subscriptionId } = body

    if (!email || !password || !schoolName || !cnpj) {
      return jsonResponse({ error: 'Dados insuficientes para criar a conta.' }, 400)
    }

    // 1. Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: directorName,
        user_type: 'school_admin',
      },
    })

    if (authError || !authData.user) {
      console.error('Auth error:', authError)
      return jsonResponse({ error: 'Erro ao criar conta ou e-mail já cadastrado.' }, 400)
    }

    const userId = authData.user.id

    // 2. Criar Escola
    const slug = schoolName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: schoolName.trim(),
        slug: slug || `escola-${Date.now()}`,
        cnpj: cnpj,
        student_count: studentCount,
        asaas_customer_id: asaasCustomerId,
        subscription_id: subscriptionId,
        subscription_status: 'active' // Assumimos ativo se o cartão passou no Asaas. Webhook pode revogar.
      })
      .select()
      .single()

    if (schoolError || !schoolData) {
      console.error('School error:', schoolError)
      await supabase.auth.admin.deleteUser(userId)
      return jsonResponse({ error: 'Erro ao registrar escola no banco de dados.' }, 500)
    }

    // 3. Criar Profile
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: directorName,
      email: email.toLowerCase().trim(),
      role: 'school_admin',
      school_id: schoolData.id,
      status: 'active',
    })

    // 4. Atualizar metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: directorName,
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
