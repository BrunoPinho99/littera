import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://app.littera.com.br',
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
  const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY');

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

  const ASAAS_ENV = Deno.env.get('ASAAS_ENV') || 'production';
  const ASAAS_BASE = ASAAS_ENV === 'sandbox'
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'

  const asaasHeaders = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_KEY,
  }

  try {
    const body = await req.json()
    const { paymentMethod, action, billingCpfCnpj } = body

    // 1. Obter Profile e School do usuário logado
    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
    if (!profile?.school_id) return jsonResponse({ error: 'Escola não encontrada.' }, 404)

    const { data: school } = await supabase.from('schools').select('asaas_customer_id, subscription_id, cnpj').eq('id', profile.school_id).single()
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

    // 2. Buscar o cliente no Asaas para obter dados do titular do cartão (CreditCardHolderInfo)
    let customerInfo: any = null;
    if (paymentMethod === 'CREDIT_CARD') {
      const customerRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, { headers: asaasHeaders });
      if (customerRes.ok) {
        customerInfo = await customerRes.json();
      }
    }

    // 3. Atualizar assinatura no Asaas para o método de pagamento escolhido
    if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'PIX' || paymentMethod === 'BOLETO') {
      const updatePayload: Record<string, unknown> = {
        billingType: paymentMethod,
        updatePendingPayments: true
      }

      if (paymentMethod === 'CREDIT_CARD' && body.ccNumber) {
        const [month, year] = (body.ccExpiry || '').split('/');
        const expiryYear = year?.length === 2 ? `20${year}` : year;

        updatePayload.creditCard = {
          holderName: body.ccHolderName,
          number: body.ccNumber.replace(/\D/g, ''),
          expiryMonth: month,
          expiryYear: expiryYear,
          ccv: body.ccCvv
        };

        if (customerInfo) {
          updatePayload.creditCardHolderInfo = {
            name: customerInfo.name,
            email: customerInfo.email,
            cpfCnpj: customerInfo.cpfCnpj,
            postalCode: customerInfo.postalCode,
            addressNumber: customerInfo.addressNumber,
            phone: customerInfo.phone || customerInfo.mobilePhone
          };
        }
      }
      
      const updateRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify(updatePayload),
      })
      
      if (!updateRes.ok) {
        const errData = await updateRes.json();
        console.error('[pay-subscription] Asaas update error:', errData);
        if (paymentMethod === 'CREDIT_CARD' && errData.errors?.[0]) {
           return jsonResponse({ error: `Erro no cartão: ${errData.errors[0].description}` });
        }
      }
    }

    // 4. Buscar o pagamento vinculado à assinatura para retornar o código PIX/Boleto ou verificar status do Cartão
    let firstPayment: Record<string, any> | null = null;
    let paymentStatus = 'PENDING';
    
    // Fazer polling de até 10 segundos (5 tentativas x 2s) para dar tempo ao Asaas processar o cartão
    for (let i = 0; i < 5; i++) {
      const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`, { headers: asaasHeaders });
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        const payments = paymentsData.data || [];
        if (payments.length > 0) {
          firstPayment = payments[0];
          paymentStatus = firstPayment.status;
          
          if (paymentMethod !== 'CREDIT_CARD') {
            break; // Para PIX e Boleto não precisamos aguardar mudança de status síncrona
          }
          
          // Se o pagamento do cartão já teve um desfecho, paramos de fazer polling
          if (paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED' || paymentStatus === 'REJECTED' || paymentStatus === 'FAILED') {
            break;
          }
        }
      }
      
      if (paymentMethod !== 'CREDIT_CARD') break;
      await new Promise(res => setTimeout(res, 2000));
    }

    if (!firstPayment) {
      return jsonResponse({ error: 'Nenhum pagamento encontrado para esta assinatura.' }, 404);
    }

    // 5. Tratamento rigoroso de recusa do Cartão de Crédito
    if (paymentMethod === 'CREDIT_CARD' && (paymentStatus === 'REJECTED' || paymentStatus === 'FAILED')) {
      const reason = firstPayment.creditCard?.transactionReceiptUrl 
        ? 'Cartão recusado pelo banco emissor.' 
        : 'Transação falhou ou foi bloqueada pelo antifraude.';
      return jsonResponse({ error: `Pagamento recusado: ${reason} Verifique os dados e tente novamente.` }, 400);
    }

    let pixQrCode = null
    let pixCopyPaste = null
    const bankSlipUrl = firstPayment.bankSlipUrl

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

  } catch (err: unknown) {
    console.error('[pay-subscription] Internal Error:', err)
    return jsonResponse({ error: 'Erro interno no servidor.' }, 500)
  }
})
