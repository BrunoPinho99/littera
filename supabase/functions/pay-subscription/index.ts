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
  const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')

  if (!supabaseUrl || !supabaseServiceKey) return jsonResponse({ error: 'Configuração de banco de dados ausente.' }, 500)
  if (!ASAAS_KEY) return jsonResponse({ error: 'Configuração de pagamento ausente.' }, 500)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Não autorizado.' }, 401)

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (userError || !user) return jsonResponse({ error: 'Não autorizado.' }, 401)

  const ASAAS_ENV = Deno.env.get('ASAAS_ENV') || 'production'
  const ASAAS_BASE = ASAAS_ENV === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3'
  const asaasHeaders = { 'Content-Type': 'application/json', 'access_token': ASAAS_KEY }

  try {
    const body = await req.json()
    const { action, studentCount, billingCycle, billingType = 'UNDEFINED' } = body

    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
    if (!profile?.school_id) return jsonResponse({ error: 'Escola não encontrada.' }, 404)

    const { data: school } = await supabase
      .from('schools')
      .select('asaas_customer_id, subscription_id, cnpj')
      .eq('id', profile.school_id)
      .single()

    if (!school) return jsonResponse({ error: 'Dados da escola não encontrados.' }, 404)

    const customerId = school.asaas_customer_id
    if (!customerId) return jsonResponse({ error: 'Cliente Asaas não encontrado.' }, 400)

    const subscriptionId = school.subscription_id // Pode ser sub_ ou inst_ (ou null)

    // ─── 1. ACTION: CHECK_STATUS ─────────────────────────────────────────────
    if (action === 'check_status') {
      if (!subscriptionId) return jsonResponse({ error: 'Nenhum pagamento pendente' }, 404)

      let fetchUrl = `${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`
      if (subscriptionId.startsWith('inst_')) fetchUrl = `${ASAAS_BASE}/payments?installment=${subscriptionId}`
      else if (subscriptionId.startsWith('pay_')) fetchUrl = `${ASAAS_BASE}/payments?id=${subscriptionId}`

      const checkRes = await fetch(fetchUrl, { headers: asaasHeaders })
      if (!checkRes.ok) return jsonResponse({ error: 'Erro ao consultar Asaas' }, 500)

      const checkData = await checkRes.json()
      const payments = checkData.data || []
      if (payments.length === 0) return jsonResponse({ status: 'PENDING', invoiceUrl: null })

      const latestPayment = payments[0]
      if (latestPayment.status === 'CONFIRMED' || latestPayment.status === 'RECEIVED') {
        const nowIso = new Date().toISOString()
        await supabase.from('schools')
          .update({ subscription_status: 'active', plano_ativado_em: nowIso })
          .eq('id', profile.school_id)
        await supabase.from('payments')
          .update({ status: 'paid', paid_at: nowIso, invoice_url: latestPayment.invoiceUrl || null })
          .eq('asaas_payment_id', latestPayment.id)
        return jsonResponse({ status: 'PAID', invoiceUrl: latestPayment.invoiceUrl || null })
      }

      return jsonResponse({
        status: 'PENDING',
        invoiceUrl: latestPayment.invoiceUrl || null,
      })
    }

    // ─── 2. ACTION: UPDATE_PLAN ──────────────────────────────────────────────
    if (action === 'update_plan') {
      if (!subscriptionId) return jsonResponse({ error: 'Nenhuma assinatura para atualizar' }, 400)
      if (subscriptionId.startsWith('inst_')) {
        return jsonResponse({ error: 'Não é possível alterar plano de parcelamentos (anual) sem cancelar. Entre em contato com o suporte.' }, 400)
      }

      if (!studentCount || !billingCycle) return jsonResponse({ error: 'Faltam parâmetros.' }, 400)

      let pricePerStudent = 0
      if (studentCount <= 200) pricePerStudent = 8.90
      else if (studentCount <= 500) pricePerStudent = 7.90
      else if (studentCount <= 1000) pricePerStudent = 6.90
      else pricePerStudent = 5.90

      const isYearly = billingCycle === 'YEARLY'
      if (isYearly) return jsonResponse({ error: 'O upgrade para Anual via painel criará um parcelamento. Esta rota está em construção.' }, 400)

      const monthlyTotal = studentCount * pricePerStudent

      const updateRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          value: monthlyTotal,
          cycle: 'MONTHLY',
          description: `Assinatura Littera – Plano School (${studentCount} alunos)`,
          updatePendingPayments: true
        }),
      })

      if (!updateRes.ok) {
        const errData = await updateRes.json()
        return jsonResponse({ error: errData.errors?.[0]?.description || 'Erro ao atualizar plano' }, 500)
      }

      await supabase.from('schools').update({ student_count: studentCount }).eq('id', profile.school_id)
      return jsonResponse({ success: true, message: 'Plano atualizado' })
    }

    // ─── 3. CRIAÇÃO DE ASSINATURA OU PARCELAMENTO (100% HOSPEDADO NO ASAAS) ──
    if (!studentCount || !billingCycle) return jsonResponse({ error: 'Dados do plano ausentes.' }, 400)

    const isYearly = billingCycle === 'YEARLY'
    const discount = isYearly ? 0.6 : 1

    let pricePerStudent = 0
    if (studentCount <= 200) pricePerStudent = 8.90
    else if (studentCount <= 500) pricePerStudent = 7.90
    else if (studentCount <= 1000) pricePerStudent = 6.90
    else pricePerStudent = 5.90

    pricePerStudent = pricePerStudent * discount
    const monthlyTotal = studentCount * pricePerStudent
    const planPrice = isYearly ? monthlyTotal * 12 : monthlyTotal

    const resolvedBillingType = ['UNDEFINED', 'BOLETO', 'CREDIT_CARD', 'PIX'].includes(billingType)
      ? billingType
      : 'UNDEFINED'

    let newSubscriptionId = subscriptionId
    let firstPayment: any = null

    if (isYearly) {
      // POST /payments (Parcelamento Anual em 12x no Checkout Asaas)
      const installmentPayload: Record<string, unknown> = {
        customer: customerId,
        billingType: resolvedBillingType,
        installmentCount: 12,
        installmentValue: monthlyTotal,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Parcelamento Anual Littera – Plano School (${studentCount} alunos)`,
        externalReference: profile.school_id,
      }

      const createRes = await fetch(`${ASAAS_BASE}/payments`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify(installmentPayload),
      })
      const createData = await createRes.json()
      if (!createRes.ok) {
        return jsonResponse({ error: `Erro no Asaas: ${createData.errors?.[0]?.description || 'Falha ao gerar cobrança.'}` }, 400)
      }

      newSubscriptionId = createData.installment || createData.id
      firstPayment = createData
    } else {
      // POST /subscriptions (Assinatura Mensal Recorrente no Checkout Asaas)
      if (!newSubscriptionId || newSubscriptionId.startsWith('inst_')) {
        const subscriptionPayload: Record<string, unknown> = {
          customer: customerId,
          billingType: resolvedBillingType,
          value: planPrice,
          nextDueDate: new Date().toISOString().split('T')[0],
          cycle: 'MONTHLY',
          description: `Assinatura Mensal Littera – Plano School (${studentCount} alunos)`,
          externalReference: profile.school_id,
        }

        const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
          method: 'POST',
          headers: asaasHeaders,
          body: JSON.stringify(subscriptionPayload),
        })
        const subData = await subRes.json()
        if (!subRes.ok) {
          return jsonResponse({ error: `Erro no Asaas: ${subData.errors?.[0]?.description || 'Falha ao criar assinatura.'}` }, 400)
        }
        newSubscriptionId = subData.id
      } else {
        const updatePayload: Record<string, unknown> = {
          billingType: resolvedBillingType,
          value: planPrice,
          description: `Assinatura Mensal Littera – Plano School (${studentCount} alunos)`,
          externalReference: profile.school_id,
          updatePendingPayments: true,
        }
        const subRes = await fetch(`${ASAAS_BASE}/subscriptions/${newSubscriptionId}`, {
          method: 'POST',
          headers: asaasHeaders,
          body: JSON.stringify(updatePayload),
        })
        if (!subRes.ok) {
          const errData = await subRes.json()
          return jsonResponse({ error: errData.errors?.[0]?.description || 'Falha ao atualizar assinatura.' }, 400)
        }
      }

      // Buscar primeira cobrança gerada para a assinatura
      const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${newSubscriptionId}/payments`, { headers: asaasHeaders })
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        if (paymentsData.data && paymentsData.data.length > 0) {
          firstPayment = paymentsData.data[0]
        }
      }
    }

    if (!firstPayment) return jsonResponse({ error: 'Nenhum pagamento gerado pelo Asaas.' }, 404)

    // Atualizar tabela schools com o ID da assinatura/parcelamento
    await supabase
      .from('schools')
      .update({ subscription_id: newSubscriptionId, student_count: studentCount })
      .eq('id', profile.school_id)

    // Inserir registro em payments com invoice_url
    await supabase.from('payments').insert({
      school_id: profile.school_id,
      user_id: user.id,
      plan: `school_${studentCount}_${billingCycle.toLowerCase()}`,
      amount: planPrice,
      status: 'pending',
      asaas_subscription_id: newSubscriptionId,
      asaas_payment_id: firstPayment.id,
      invoice_url: firstPayment.invoiceUrl || null,
    })

    return jsonResponse({
      success: true,
      status: 'PENDING',
      invoiceUrl: firstPayment.invoiceUrl || null,
      subscriptionId: newSubscriptionId,
    })
  } catch (err: unknown) {
    console.error('[pay-subscription] Internal Error:', err)
    return jsonResponse({ error: 'Erro interno no servidor.' }, 500)
  }
})
