// supabase/functions/create-checkout/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

  const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')
  if (!ASAAS_KEY) {
    return jsonResponse({ error: 'Configuração de pagamento ausente.' })
  }

  const ASAAS_BASE = ASAAS_KEY.includes('hmlg')
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'

  const asaasHeaders = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_KEY,
  }

  try {
    const body = await req.json()
    const { email, schoolName, cnpj, studentCount, billingCycle } = body

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
        return jsonResponse({ error: customerData.errors?.[0]?.description || 'Erro ao criar cliente.' })
      }
      asaasCustomerId = customerData.id
    }

    // 3. Criar Assinatura via Boleto/Pix/Cartão genérico (Redirecionamento)
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
      return jsonResponse({ error: subData.errors?.[0]?.description || 'Falha ao processar a assinatura.' })
    }

    const subscriptionId = subData.id

    // 4. Pegar o Link de Checkout do Primeiro Pagamento
    const paymentsRes = await fetch(`${ASAAS_BASE}/payments?subscription=${subscriptionId}`, { headers: asaasHeaders })
    let checkoutUrl = `https://www.asaas.com/c/${asaasCustomerId}`

    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json()
      if (paymentsData.data?.length > 0) {
        checkoutUrl = paymentsData.data[0].invoiceUrl
      }
    }

    return jsonResponse({
      success: true,
      asaasCustomerId,
      subscriptionId,
      checkoutUrl
    })

  } catch (err: unknown) {
    console.error('Error create-checkout:', err)
    const message = err instanceof Error ? err.message : 'Erro interno no servidor de pagamento'
    return jsonResponse({ error: message })
  }
})
