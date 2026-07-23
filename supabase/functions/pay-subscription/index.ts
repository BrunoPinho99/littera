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
    const { paymentMethod, creditCardData, action } = body

    // 1. Obter Profile e School do usuário logado
    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
    if (!profile?.school_id) return jsonResponse({ error: 'Escola não encontrada.' }, 404)

    const { data: school } = await supabase.from('schools').select('asaas_customer_id, subscription_id').eq('id', profile.school_id).single()
    if (!school?.subscription_id) return jsonResponse({ error: 'Assinatura não encontrada.' }, 404)

    const subscriptionId = school.subscription_id
    const customerId = school.asaas_customer_id

    // Action para verificar o status sem tentar pagar de novo (útil como fallback do webhook)
    if (action === 'check_status') {
      const checkRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`, { headers: asaasHeaders })
      if (!checkRes.ok) return jsonResponse({ error: 'Erro ao consultar Asaas' }, 500)
      
      const checkData = await checkRes.json()
      const payments = checkData.data || []
      if (payments.length === 0) return jsonResponse({ status: 'PENDING_CARD' })
      
      const latestPayment = payments[0]
      if (latestPayment.status === 'CONFIRMED' || latestPayment.status === 'RECEIVED') {
        await supabase.from('schools').update({ subscription_status: 'active' }).eq('id', profile.school_id)
        return jsonResponse({ status: 'PAID' })
      } else if (latestPayment.status === 'FAILED' || latestPayment.status === 'REJECTED') {
        return jsonResponse({ status: 'REJECTED' })
      }
      return jsonResponse({ status: 'PENDING_CARD' })
    }

    // 2. Atualizar assinatura no Asaas se for Cartão de Crédito
    if (paymentMethod === 'CREDIT_CARD' && creditCardData) {
      // Obter dados do customer no Asaas para preencher creditCardHolderInfo corretamente
      const customerRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, { headers: asaasHeaders })
      const customerInfo = await customerRes.json()

      const updatePayload: any = {
        billingType: 'CREDIT_CARD',
        updatePendingPayments: true, // Garante que a cobrança já criada mude para Cartão e tente cobrar agora
        creditCard: creditCardData
      }
      
      if (creditCardData.holderName) {
        updatePayload.creditCardHolderInfo = {
          name: creditCardData.holderName,
          email: user.email,
          cpfCnpj: customerInfo.cpfCnpj || '00000000000',
          postalCode: body.billingPostalCode || customerInfo.postalCode || '01310900',
          addressNumber: body.billingAddressNumber || customerInfo.addressNumber || '157',
          phone: customerInfo.phone || customerInfo.mobilePhone || '11999999999'
        }
      }

      const updateRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify(updatePayload),
      })
      
      const updateData = await updateRes.json()
      if (!updateRes.ok) {
        console.error('[pay-subscription] Asaas update error:', updateData)
        return jsonResponse({ error: `Erro ao atualizar assinatura: ${updateData.errors?.[0]?.description || 'Erro desconhecido'}` })
      }

      // NOVO: Pegar a cobrança pendente gerada e pagá-la explicitamente
      const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments?status=PENDING`, { headers: asaasHeaders })
      const paymentsData = await paymentsRes.json()
      const pendingPayment = paymentsData.data?.[0]

      if (pendingPayment) {
        const payPayload = {
          creditCard: creditCardData,
          creditCardHolderInfo: updatePayload.creditCardHolderInfo
        }
        const payRes = await fetch(`${ASAAS_BASE}/payments/${pendingPayment.id}/payWithCreditCard`, {
          method: 'POST',
          headers: asaasHeaders,
          body: JSON.stringify(payPayload)
        })
        const payData = await payRes.json()
        if (!payRes.ok) {
          console.error('[pay-subscription] Asaas pay error:', payData)
          return jsonResponse({ error: `Erro ao processar cartão: ${payData.errors?.[0]?.description || 'Transação recusada'}` })
        }
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

    // 3. Para cartão de crédito, fazer polling no Asaas até obter resposta definitiva
    if (paymentMethod === 'CREDIT_CARD') {
      // Esperar até 5 tentativas (3s cada = ~15s total) para o Asaas processar
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const checkRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`, {
          headers: asaasHeaders
        })
        
        if (!checkRes.ok) continue
        
        const checkData = await checkRes.json()
        const payments = checkData.data || []
        if (payments.length === 0) continue
        
        const latestPayment = payments[0]
        console.log(`[pay-subscription] Attempt ${attempt + 1}: payment status = ${latestPayment.status}`)
        
        if (latestPayment.status === 'CONFIRMED' || latestPayment.status === 'RECEIVED') {
          await supabase.from('schools').update({ subscription_status: 'active' }).eq('id', profile.school_id)
          return jsonResponse({ message: 'Pagamento aprovado!', status: 'PAID', billingType: 'CREDIT_CARD' })
        }
        
        if (latestPayment.status === 'FAILED' || latestPayment.status === 'REJECTED' || latestPayment.status === 'REFUNDED') {
          return jsonResponse({ error: 'Cartão recusado pelo banco. Verifique os dados e tente novamente.' })
        }
        
        // Se PENDING, continua tentando...
      }
      
      // Após 5 tentativas (~15s), retornar que está em análise
      return jsonResponse({ 
        message: 'Pagamento em análise pelo banco. Aguarde alguns instantes e a tela será liberada automaticamente.', 
        status: 'PENDING_CARD',
        billingType: 'CREDIT_CARD'
      })
    }

    // 4. Buscar o pagamento vinculado à assinatura para retornar o código PIX/Boleto
    let firstPayment: any = null;
    const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`, { headers: asaasHeaders });
    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json();
      const payments = paymentsData.data || [];
      if (payments.length > 0) {
        firstPayment = payments[0];
      }
    }

    if (!firstPayment) {
      return jsonResponse({ error: 'Nenhum pagamento encontrado para esta assinatura.' }, 404);
    }

    let pixQrCode = null
    let pixCopyPaste = null
    let bankSlipUrl = firstPayment.bankSlipUrl

    if (paymentMethod === 'PIX') {
      // Opcional: tentar forçar a atualização do pagamento em si para PIX, caso o Asaas não tenha feito
      await fetch(`${ASAAS_BASE}/payments/${firstPayment.id}`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({ billingType: 'PIX' })
      })

      const pixRes = await fetch(`${ASAAS_BASE}/payments/${firstPayment.id}/pixQrCode`, { headers: asaasHeaders })
      if (pixRes.ok) {
        const pixData = await pixRes.json()
        pixQrCode = pixData.encodedImage
        pixCopyPaste = pixData.payload
      } else {
        const pixErr = await pixRes.json()
        console.error('[pay-subscription] Asaas Pix error:', pixErr)
        return jsonResponse({ error: `Erro ao gerar Pix no Asaas: ${pixErr.errors?.[0]?.description || 'Tente Boleto ou Cartão.'}` })
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
