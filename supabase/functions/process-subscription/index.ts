
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Configuração de banco de dados ausente.' })
  }

  if (!ASAAS_KEY) {
    return jsonResponse({ error: 'Configuração de pagamento ausente.' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const ASAAS_BASE = ASAAS_KEY.includes('hmlg')
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'

  const asaasHeaders = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_KEY,
  }

  let createdAuthUserId: string | null = null

  try {
    const body = await req.json()
    const { directorName, email, password, schoolName, cnpj, studentCount, billingCycle, creditCardToken } = body

    if (!creditCardToken) {
      return jsonResponse({ error: 'Token do cartão de crédito não fornecido.' })
    }

    // 1. Cálculo de preço
    const isYearly = billingCycle === 'YEARLY'
    const discount = isYearly ? 0.8 : 1
    const pricePerStudent = studentCount <= 200 ? 9 * discount : 7 * discount
    const planId = studentCount <= 200 ? 'starter' : 'school'
    const monthlyTotal = studentCount * pricePerStudent
    const planPrice = isYearly ? monthlyTotal * 12 : monthlyTotal

    // 2. Buscar ou Criar Customer no Asaas
    let asaasCustomerId = null
    const searchRes = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cnpj}`, { headers: asaasHeaders })
    if (searchRes.ok) {
      const searchData = await searchRes.json()
      if (searchData.data?.length > 0) asaasCustomerId = searchData.data[0].id
    }

    if (!asaasCustomerId) {
      const createCustomerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: schoolName,
          cpfCnpj: cnpj,
          email: email,
        }),
      })
      const customerData = await createCustomerRes.json()
      if (!createCustomerRes.ok) {
        return jsonResponse({ error: customerData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.' })
      }
      asaasCustomerId = customerData.id
    }

    // 3. Processar Pagamento (Assinatura com creditCardToken)
    const today = new Date().toISOString().split('T')[0]

    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'CREDIT_CARD',
        creditCardToken: creditCardToken,
        value: planPrice,
        nextDueDate: today,
        cycle: isYearly ? 'YEARLY' : 'MONTHLY',
        description: `Assinatura Littera – Plano ${planId} (${studentCount} alunos)`
      }),
    })

    const subData = await subRes.json()

    if (!subRes.ok) {
      // Falha no pagamento (recusado, sem limite, token inválido)
      return jsonResponse({ error: subData.errors?.[0]?.description || 'Falha ao processar o cartão de crédito.' })
    }

    const subscriptionId = subData.id

    // PAGAMENTO APROVADO! Agora criamos o usuário no banco.

    // 4. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: directorName.trim(),
        user_type: 'school_admin',
      },
    })

    if (authError || !authData.user) {
      return jsonResponse({ error: authError?.message || 'Erro ao criar conta no sistema.' })
    }

    createdAuthUserId = authData.user.id

    // 5. Inserir Escola
    const slug = schoolName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: schoolName.trim(),
        slug: slug || `escola-${Date.now()}`,
        cnpj: cnpj,
        student_count: studentCount,
        asaas_customer_id: asaasCustomerId,
        subscription_id: subscriptionId,
        subscription_status: 'active'
      })
      .select()
      .single()

    if (schoolError || !schoolData) {
      return jsonResponse({ error: 'Conta criada, mas falhou ao vincular escola.' })
    }

    const createdSchoolId = schoolData.id

    // 6. Atualizar profile
    await supabase.from('profiles').upsert({
      id: createdAuthUserId,
      full_name: directorName.trim(),
      email: email.toLowerCase().trim(),
      role: 'school_admin',
      school_id: createdSchoolId,
      status: 'active',
    })

    await supabase.auth.admin.updateUserById(createdAuthUserId, {
      user_metadata: { school_id: createdSchoolId },
    })

    return jsonResponse({
      success: true,
      schoolId: createdSchoolId,
      userId: createdAuthUserId,
      message: 'Pagamento aprovado e conta criada com sucesso!',
    })

  } catch (err: unknown) {
    console.error('Error process-subscription:', err)
    const message = err instanceof Error ? err.message : 'Erro interno no servidor de pagamento'
    return jsonResponse({ error: message || 'Erro interno no servidor de pagamento' })
  }
})
