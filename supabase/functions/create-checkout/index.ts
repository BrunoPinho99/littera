// supabase/functions/create-checkout/index.ts
// Cria uma cobrança/assinatura no Asaas e vincula ao school_id do Supabase
// via externalReference — para o webhook conseguir identificar a escola.

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

  // ── Variáveis de ambiente ─────────────────────────────────────────────────
  const ASAAS_KEY        = Deno.env.get('ASAAS_API_KEY')
  const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!ASAAS_KEY) return jsonResponse({ error: 'Configuração de pagamento ausente.' })
  if (!SUPABASE_URL || !SUPABASE_SRV_KEY) return jsonResponse({ error: 'Configuração de banco ausente.' })

  const ASAAS_ENV = Deno.env.get('ASAAS_ENV');
  const ASAAS_BASE = (ASAAS_ENV === 'sandbox' || ASAAS_KEY.includes('hmlg'))
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'

  const asaasHeaders = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_KEY,
  }

  // ── Autenticar usuário via JWT do Supabase ────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Não autenticado.' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SRV_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !user) {
    return jsonResponse({ error: 'Token inválido ou expirado.' }, 401)
  }

  // ── Buscar school_id do perfil do usuário ─────────────────────────────────
  const schoolId = user.user_metadata?.school_id as string | undefined
  if (!schoolId) {
    return jsonResponse({ error: 'Usuário não vinculado a uma escola.' }, 400)
  }

  // Buscar dados completos da escola
  const { data: school, error: schoolErr } = await supabase
    .from('schools')
    .select('id, name, cnpj, email, student_count, asaas_customer_id')
    .eq('id', schoolId)
    .single()

  if (schoolErr || !school) {
    return jsonResponse({ error: 'Escola não encontrada.' }, 404)
  }

  try {
    const body = await req.json()
    const { studentCount, billingCycle, billingType = 'UNDEFINED' } = body

    const count = studentCount ?? school.student_count ?? 0

    // ── Cálculo de preço ──────────────────────────────────────────────────
    const isYearly        = billingCycle === 'YEARLY'
    const discount        = isYearly ? 0.8 : 1
    const pricePerStudent = count <= 200 ? 9 * discount : 7 * discount
    const planId          = count <= 200 ? 'starter' : 'school'
    const monthlyTotal    = count * pricePerStudent
    const planPrice       = isYearly ? monthlyTotal * 12 : monthlyTotal

    // ── Buscar ou Criar Customer no Asaas ─────────────────────────────────
    let asaasCustomerId: string = school.asaas_customer_id

    if (!asaasCustomerId && school.cnpj) {
      const searchRes = await fetch(
        `${ASAAS_BASE}/customers?cpfCnpj=${school.cnpj.replace(/\D/g, '')}`,
        { headers: asaasHeaders }
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (searchData.data?.length > 0) asaasCustomerId = searchData.data[0].id
      }
    }

    if (!asaasCustomerId) {
      const createCustomerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name:      school.name,
          cpfCnpj:  school.cnpj?.replace(/\D/g, ''),
          email:    school.email,
        }),
      })
      const customerData = await createCustomerRes.json()
      if (!createCustomerRes.ok) {
        return jsonResponse({ error: customerData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.' })
      }
      asaasCustomerId = customerData.id

      // Salvar o customer_id na escola
      await supabase.from('schools').update({ asaas_customer_id: asaasCustomerId }).eq('id', schoolId)
    }

    // ── Criar Assinatura no Asaas com externalReference = schoolId ────────
    // O externalReference é o elo entre o Asaas e o Supabase.
    // O webhook usa esse campo para saber qual escola ativar.
    const today = new Date().toISOString().split('T')[0]

    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify({
        customer:          asaasCustomerId,
        billingType:       billingType,         // PIX, BOLETO, CREDIT_CARD ou UNDEFINED
        value:             planPrice,
        nextDueDate:       today,
        cycle:             isYearly ? 'YEARLY' : 'MONTHLY',
        description:       `Assinatura Littera – Plano ${planId} (${count} alunos)`,
        externalReference: schoolId,            // ← VINCULO COM O SUPABASE
      }),
    })

    const subData = await subRes.json()

    if (!subRes.ok) {
      return jsonResponse({ error: subData.errors?.[0]?.description || 'Falha ao criar assinatura no Asaas.' })
    }

    const subscriptionId = subData.id

    // Salvar subscription_id na escola
    await supabase
      .from('schools')
      .update({ subscription_id: subscriptionId })
      .eq('id', schoolId)

    // ── Buscar link/QR Code do primeiro pagamento ─────────────────────────
    let invoiceUrl:    string | null = null
    let pixQrCode:    string | null = null
    let pixCopyPaste: string | null = null
    let bankSlipUrl:  string | null = null

    // Aguarda 1s para o Asaas gerar a cobrança
    await new Promise(r => setTimeout(r, 1000))

    const paymentsRes = await fetch(
      `${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`,
      { headers: asaasHeaders }
    )

    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json()
      if (paymentsData.data?.length > 0) {
        const firstPayment = paymentsData.data[0]
        invoiceUrl   = firstPayment.invoiceUrl
        bankSlipUrl  = firstPayment.bankSlipUrl

        if (billingType === 'PIX') {
          const pixRes = await fetch(
            `${ASAAS_BASE}/payments/${firstPayment.id}/pixQrCode`,
            { headers: asaasHeaders }
          )
          if (pixRes.ok) {
            const pixData = await pixRes.json()
            pixQrCode    = pixData.encodedImage
            pixCopyPaste = pixData.payload
          }
        }
      }
    }

    return jsonResponse({
      success:        true,
      asaasCustomerId,
      subscriptionId,
      invoiceUrl,
      pixQrCode,
      pixCopyPaste,
      bankSlipUrl,
      billingType,
      planPrice,
      planId,
    })

  } catch (err: unknown) {
    console.error('[create-checkout] Erro:', err)
    const message = err instanceof Error ? err.message : 'Erro interno no servidor de pagamento'
    return jsonResponse({ error: message })
  }
})
