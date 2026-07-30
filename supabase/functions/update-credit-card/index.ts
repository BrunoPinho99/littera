import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || ''
const IS_PRODUCTION = Deno.env.get('IS_PRODUCTION') === 'true'
const ASAAS_BASE = !IS_PRODUCTION 
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY,
}

Deno.serve(async (req: Request) => {
  // CORS Options
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Check Auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Não autorizado.')

    const { schoolId, creditCardData } = await req.json()

    if (!schoolId || !creditCardData) {
      throw new Error('Parâmetros incompletos.')
    }

    // Verify if user belongs to this school
    const profileSchoolId = user.user_metadata?.school_id
    if (profileSchoolId !== schoolId) {
      throw new Error('Permissão negada.')
    }

    // Service role for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get school's subscription_id and asaas_customer_id
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('subscription_id, asaas_customer_id')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      throw new Error('Escola não encontrada.')
    }

    if (!school.subscription_id || !school.asaas_customer_id) {
      throw new Error('A escola não possui uma assinatura ativa no Asaas.')
    }

    const { subscription_id: subscriptionId, asaas_customer_id: customerId } = school

    // Update subscription in Asaas with the new credit card
    const updatePayload = {
      updatePendingPayments: true,
      creditCard: {
        holderName: creditCardData.holderName,
        number: creditCardData.number,
        expiryMonth: creditCardData.expiryMonth,
        expiryYear: creditCardData.expiryYear,
        ccv: creditCardData.ccv
      },
      creditCardHolderInfo: {
        name: user.user_metadata?.full_name || 'Usuário Escola',
        email: user.email,
        cpfCnpj: creditCardData.cpfCnpj || '00000000000',
        postalCode: creditCardData.postalCode || '00000000',
        addressNumber: creditCardData.addressNumber || '0',
        phone: user.user_metadata?.phone || creditCardData.phone || ''
      }
    }

    console.log(`Updating credit card for subscription ${subscriptionId}...`)
    
    const updateRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(updatePayload)
    })

    const updateData = await updateRes.json()

    if (!updateRes.ok) {
      console.error('Asaas update error:', updateData)
      const asaasMsg = updateData.errors?.[0]?.description || 'Erro ao validar o cartão no Asaas.'
      return new Response(JSON.stringify({ error: asaasMsg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Cartão atualizado com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
