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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Não autorizado.' }, 401)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // Verificar usuário
  const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (userError || !user) {
    return jsonResponse({ error: 'Não autorizado.' }, 401)
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
    const { paymentMethod, creditCardData } = body

    // 1. Obter a escola do usuário
    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
    if (!profile || !profile.school_id) {
      return jsonResponse({ error: 'Escola não encontrada para este usuário.' }, 404)
    }

    const { data: school } = await supabase.from('schools').select('asaas_customer_id, subscription_id').eq('id', profile.school_id).single()
    if (!school || !school.subscription_id) {
      return jsonResponse({ error: 'Assinatura não encontrada para esta escola.' }, 404)
    }

    const { subscription_id: subscriptionId, asaas_customer_id: customerId } = school

    // 2. Atualizar assinatura no Asaas se for Cartão de Crédito
    if (paymentMethod === 'CREDIT_CARD' && creditCardData) {
      const updatePayload: any = {
        billingType: 'CREDIT_CARD',
        creditCard: creditCardData
      }
      
      if (creditCardData.holderName) {
        updatePayload.creditCardHolderInfo = {
          name: creditCardData.holderName,
          email: user.email,
          cpfCnpj: '00000000000', // Asaas geralmente requer isso, mas podemos tentar sem ou com um dummy se já estiver no customer
          postalCode: '01310900',
          addressNumber: '157',
          phone: '11999999999'
        }
      }

      const updateRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
        method: 'POST', // Asaas uses POST for updating
        headers: asaasHeaders,
        body: JSON.stringify(updatePayload),
      })
      
      const updateData = await updateRes.json()
      if (!updateRes.ok) {
        console.error('[pay-subscription] Asaas update error:', updateData)
        return jsonResponse({ error: `Erro ao atualizar dados do cartão: ${updateData.errors?.[0]?.description || 'Erro desconhecido'}` })
      }
    } else if (paymentMethod === 'PIX' || paymentMethod === 'BOLETO') {
      // Opcionalmente atualizamos o tipo de cobrança da assinatura para PIX/Boleto
      const updateRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({ billingType: paymentMethod }),
      })
      if (!updateRes.ok) {
        console.error('[pay-subscription] Asaas update to PIX/BOLETO error')
      }
    }

    // 3. Buscar os dados do pagamento pendente para exibir na tela (QR Code / Boleto)
    const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments?status=PENDING`, {
      headers: asaasHeaders
    })
    
    if (!paymentsRes.ok) {
      return jsonResponse({ error: 'Erro ao buscar pagamento pendente.' })
    }

    const paymentsData = await paymentsRes.json()
    const pendingPayments = paymentsData.data || []
    
    if (pendingPayments.length === 0) {
      // Se não houver pendente, talvez já esteja pago ou aguardando gerar
      return jsonResponse({ message: 'Nenhum pagamento pendente no momento.', status: 'NO_PENDING' })
    }

    const firstPayment = pendingPayments[0]
    let pixQrCode = null
    let pixCopyPaste = null
    let bankSlipUrl = firstPayment.bankSlipUrl

    if (paymentMethod === 'PIX') {
      const pixRes = await fetch(`${ASAAS_BASE}/payments/${firstPayment.id}/pixQrCode`, { headers: asaasHeaders })
      if (pixRes.ok) {
        const pixData = await pixRes.json()
        pixQrCode = pixData.encodedImage
        pixCopyPaste = pixData.payload
      }
    }

    return jsonResponse({
      message: 'Pagamento processado com sucesso.',
      billingType: paymentMethod,
      invoiceUrl: firstPayment.invoiceUrl,
      bankSlipUrl,
      pixQrCode,
      pixCopyPaste
    })

  } catch (err: any) {
    console.error('[pay-subscription] Internal Error:', err)
    return jsonResponse({ error: 'Erro interno no servidor.' }, 500)
  }
})
