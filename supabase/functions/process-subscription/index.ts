
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

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

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
    const { directorName, email, password, schoolName, cnpj, studentCount, billingCycle, phone, postalCode, addressNumber } = body

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
          phone: phone,
          postalCode: postalCode,
          addressNumber: addressNumber || "0"
        }),
      })
      const customerData = await createCustomerRes.json()
      if (!createCustomerRes.ok) {
        return jsonResponse({ error: customerData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.' })
      }
      asaasCustomerId = customerData.id
    }

    // 3. Criar Assinatura no Asaas (UNDEFINED = Cliente escolhe a forma de pagamento)
    const today = new Date().toISOString().split('T')[0]
    
    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: planPrice,
        nextDueDate: today,
        cycle: isYearly ? 'YEARLY' : 'MONTHLY',
        description: `Assinatura Littera – Plano ${planId} (${studentCount} alunos)`
      }),
    })

    const subData = await subRes.json()

    if (!subRes.ok) {
      return jsonResponse({ error: subData.errors?.[0]?.description || 'Falha ao criar assinatura no Asaas.' })
    }

    const subscriptionId = subData.id

    // 4. Buscar a cobrança gerada para obter o Link de Pagamento (invoiceUrl)
    let invoiceUrl = null
    const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`, {
      headers: asaasHeaders
    })
    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json()
      if (paymentsData.data && paymentsData.data.length > 0) {
        invoiceUrl = paymentsData.data[0].invoiceUrl
      }
    }

    if (!invoiceUrl) {
      return jsonResponse({ error: 'Erro ao gerar link de pagamento.' })
    }

    // CONTA CRIADA E ASSINATURA PENDENTE! Agora criamos o usuário no banco.

    // 4. Criar ou Recuperar usuário no Supabase Auth
    let createdAuthUserId = null;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: directorName.trim(),
        user_type: 'school_admin',
      },
    })

    if (authError) {
      // Se o usuário já existe, tentamos fazer login para validar a senha
      // IMPORTANTE: Usa um client separado para não alterar a sessão do client admin
      const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
      const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        return jsonResponse({ error: 'Este e-mail já está cadastrado. Se for você, a senha está incorreta. Faça login ou recupere a senha.' })
      }
      createdAuthUserId = signInData.user.id;
    } else {
      createdAuthUserId = authData.user.id;
    }

    if (!createdAuthUserId) {
      return jsonResponse({ error: 'Erro crítico ao obter ID do usuário.' })
    }

    // 5. Verificar se o usuário já tem uma escola vinculada
    const { data: existingProfile } = await supabase.from('profiles').select('school_id').eq('id', createdAuthUserId).single();
    let createdSchoolId = existingProfile?.school_id;

    if (!createdSchoolId) {
      // Inserir Escola Nova
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: schoolName.trim(),
          cnpj: cnpj,
          email: email.toLowerCase().trim(),
          student_count: studentCount,
          asaas_customer_id: asaasCustomerId,
          subscription_id: subscriptionId,
          subscription_status: 'inactive'
        })
        .select()
        .single()

      if (schoolError || !schoolData) {
        return jsonResponse({ error: `Usuário autenticado, mas erro ao salvar escola: ${schoolError?.message || 'Desconhecido'}` })
      }
      createdSchoolId = schoolData.id;
    } else {
      // Usuário já tem escola, apenas atualizamos a assinatura
      await supabase.from('schools').update({
        asaas_customer_id: asaasCustomerId,
        subscription_id: subscriptionId,
      }).eq('id', createdSchoolId);
    }

    // 6. Atualizar profile
    await supabase.from('profiles').upsert({
      id: createdAuthUserId,
      full_name: directorName.trim(),
      email: email.toLowerCase().trim(),
      role: 'owner',
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
      message: 'Conta criada com sucesso! Redirecionando para pagamento...',
      invoiceUrl: invoiceUrl,
    })

  } catch (err: unknown) {
    console.error('Error process-subscription:', err)
    const message = err instanceof Error ? err.message : 'Erro interno no servidor de pagamento'
    return jsonResponse({ error: message || 'Erro interno no servidor de pagamento' })
  }
})
