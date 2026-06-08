// supabase/functions/create-checkout/index.ts
// Edge Function – Cria checkout externo no Asaas para assinatura B2B
// Deno Deploy runtime (Supabase Edge Functions)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Tipos ───────────────────────────────────────────────────────────────────────

interface CreateCheckoutBody {
  planId: string       // e.g. 'pro' | 'escolar'
  planPrice: number    // valor mensal em BRL (ex: 29.90)
  frequency?: number   // 1 = mensal, 6 = semestral, 12 = anual
  customer: {
    name: string
    cpfCnpj: string
    email: string
    phone?: string
    postalCode?: string
    addressNumber?: string
  }
}

interface AsaasCustomer {
  id: string
  name: string
  cpfCnpj: string
  email: string
}

interface AsaasSubscription {
  id: string
  status: string
}

interface AsaasPayment {
  id: string
  invoiceUrl: string
}

// ── CORS helpers ────────────────────────────────────────────────────────────────

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

// ── Handler principal ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405)
  }

  try {
    // ── 1. Autenticação via JWT ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Token de autenticação não fornecido.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente com JWT do usuário – respeita RLS
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401)
    }

    // Cliente admin – ignora RLS (para updates seguros)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // ── 2. Parse do body ──────────────────────────────────────────────────────
    const body: CreateCheckoutBody = await req.json()

    if (!body.planId || !body.planPrice || !body.customer?.cpfCnpj) {
      return jsonResponse({ error: 'Campos obrigatórios: planId, planPrice, customer.cpfCnpj' }, 400)
    }

    // ── 3. Identificar escola do usuário ───────────────────────────────────────
    const schoolId = user.user_metadata?.school_id as string | undefined

    if (!schoolId) {
      return jsonResponse({ error: 'Usuário não vinculado a nenhuma escola.' }, 400)
    }

    // Buscar dados atuais da escola
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, asaas_customer_id, subscription_status')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      return jsonResponse({ error: 'Escola não encontrada.' }, 404)
    }

    // Já possui assinatura ativa?
    if (school.subscription_status === 'active') {
      return jsonResponse({ error: 'Esta escola já possui uma assinatura ativa.' }, 409)
    }

    // ── 4. Config do Asaas ────────────────────────────────────────────────────
    const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')!
    if (!ASAAS_KEY) {
      console.error('[create-checkout] ASAAS_API_KEY não configurada nos secrets.')
      return jsonResponse({ error: 'Configuração de pagamento ausente.' }, 500)
    }

    // Produção vs Sandbox — detecta automaticamente pela chave
    const ASAAS_BASE = ASAAS_KEY.includes('hmlg')
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'

    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_KEY,
    }

    // ── 5. Buscar ou criar Customer no Asaas ──────────────────────────────────
    let asaasCustomerId = school.asaas_customer_id as string | null

    if (!asaasCustomerId) {
      // Tenta encontrar pelo CPF/CNPJ
      const searchRes = await fetch(
        `${ASAAS_BASE}/customers?cpfCnpj=${body.customer.cpfCnpj}`,
        { headers: asaasHeaders }
      )
      const searchData = await searchRes.json()

      if (searchData.data?.length > 0) {
        asaasCustomerId = searchData.data[0].id
      } else {
        // Criar novo cliente
        const createRes = await fetch(`${ASAAS_BASE}/customers`, {
          method: 'POST',
          headers: asaasHeaders,
          body: JSON.stringify({
            name: body.customer.name,
            cpfCnpj: body.customer.cpfCnpj,
            email: body.customer.email,
            phone: body.customer.phone || undefined,
            postalCode: body.customer.postalCode || undefined,
            addressNumber: body.customer.addressNumber || undefined,
            externalReference: schoolId,
          }),
        })

        const createData = await createRes.json()

        if (!createRes.ok) {
          const errorMsg = createData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.'
          console.error('[create-checkout] Asaas customer error:', createData)
          return jsonResponse({ error: errorMsg }, 422)
        }

        asaasCustomerId = createData.id
      }

      // Salvar o asaas_customer_id na escola
      await supabaseAdmin
        .from('schools')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', schoolId)
    }

    // ── 6. Definir ciclo de cobrança ──────────────────────────────────────────
    const frequencyMap: Record<number, string> = {
      1: 'MONTHLY',
      6: 'SEMIANNUALLY',
      12: 'YEARLY',
    }
    const cycle = frequencyMap[body.frequency || 1] || 'MONTHLY'

    // ── 7. Criar assinatura no Asaas ──────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const subscriptionPayload = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Checkout externo — permite Pix/Cartão/Boleto
      value: body.planPrice,
      nextDueDate: today,
      cycle,
      description: `Assinatura Littera – Plano ${body.planId}`,
      externalReference: schoolId,
    }

    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(subscriptionPayload),
    })

    const subData = await subRes.json()

    if (!subRes.ok) {
      const errorMsg = subData.errors?.[0]?.description || 'Erro ao criar assinatura.'
      console.error('[create-checkout] Asaas subscription error:', subData)
      return jsonResponse({ error: errorMsg }, 422)
    }

    const subscriptionId: string = subData.id

    // ── 8. Obter URL de pagamento da primeira cobrança ────────────────────────
    const paymentsRes = await fetch(
      `${ASAAS_BASE}/payments?subscription=${subscriptionId}`,
      { headers: asaasHeaders }
    )
    const paymentsData = await paymentsRes.json()

    let checkoutUrl = ''
    if (paymentsData.data?.length > 0) {
      checkoutUrl = paymentsData.data[0].invoiceUrl
    } else {
      // Fallback: página de cobranças do cliente
      checkoutUrl = `https://www.asaas.com/c/${asaasCustomerId}`
    }

    // ── 9. Atualizar escola no Supabase ───────────────────────────────────────
    await supabaseAdmin
      .from('schools')
      .update({
        subscription_id: subscriptionId,
        subscription_status: 'unpaid', // Aguardando pagamento
      })
      .eq('id', schoolId)

    // ── 10. Retornar URL de checkout ──────────────────────────────────────────
    return jsonResponse({
      success: true,
      checkoutUrl,
      subscriptionId,
      message: 'Checkout criado com sucesso. Redirecionando para pagamento.',
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.'
    console.error('[create-checkout] Unhandled error:', error)
    return jsonResponse({ error: message }, 500)
  }
})
