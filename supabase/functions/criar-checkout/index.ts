import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')!
const ASAAS_URL = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3'
const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_KEY
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento do CORS para Edge Functions chamadas via client
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { schoolId, userId, nome, email, cpfCnpj, plano, nomePlano, precoPlano } = await req.json()

    if (!schoolId || !email || !cpfCnpj || !plano || !precoPlano) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios ausentes.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Verificar se cliente já existe no Asaas (opcional, ou criar direto)
    const busca = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${cpfCnpj}`, {
      headers: asaasHeaders
    }).then(r => r.json())

    let asaasCustomerId = busca.data?.[0]?.id

    // 2. Criar cliente se não existir
    if (!asaasCustomerId) {
      const cliente = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({ name: nome, email, cpfCnpj })
      }).then(r => r.json())

      if (cliente.errors) {
        throw new Error(cliente.errors[0]?.description || 'Erro ao criar cliente no Asaas')
      }
      asaasCustomerId = cliente.id
    }

    // 3. Criar assinatura
    const nextDueDate = new Date()
    // Como a cobrança será gerada agora, pode ser para hoje ou amanhã dependendo do checkout (Asaas permite a partir de hoje)
    const dueDateStr = nextDueDate.toISOString().split('T')[0]

    const assinatura = await fetch(`${ASAAS_URL}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        nextDueDate: dueDateStr,
        value: precoPlano,
        cycle: 'MONTHLY',
        description: `Littera - Plano ${nomePlano}`,
        externalReference: schoolId   // chave para identificar no webhook
      })
    }).then(r => r.json())

    if (assinatura.errors) {
      throw new Error(assinatura.errors[0]?.description || 'Erro ao criar assinatura no Asaas')
    }

    // 4. Buscar invoiceUrl da primeira fatura
    const faturas = await fetch(`${ASAAS_URL}/subscriptions/${assinatura.id}/payments`, {
      headers: asaasHeaders
    }).then(r => r.json())

    const invoiceUrl = faturas.data?.[0]?.invoiceUrl

    // 5. Salvar no Supabase (na tabela schools, conforme nossa arquitetura)
    const { error: dbError } = await supabase.from('schools').update({
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: assinatura.id,
      plano: plano,
      subscription_status: 'pending_payment'
    }).eq('id', schoolId)

    if (dbError) {
      throw new Error(`Erro ao salvar no banco: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, invoiceUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
