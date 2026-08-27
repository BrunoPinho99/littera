import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://app.littera.com.br',
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

    const { schoolId } = await req.json()

    if (!schoolId) {
      throw new Error('Parâmetro schoolId obrigatório.')
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

    const { subscription_id: subscriptionId, asaas_customer_id: _customerId } = school

    // Busca a próxima cobrança pendente para retornar a url
    console.log(`Buscando cobrança pendente para assinatura ${subscriptionId}...`)
    const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments?status=PENDING`, { headers: asaasHeaders })
    const paymentsData = await paymentsRes.json()
    const pendingPayment = paymentsData.data?.[0]

    if (!pendingPayment?.invoiceUrl) {
      throw new Error('Não há faturas pendentes onde o cartão possa ser atualizado no momento.')
    }

    return new Response(JSON.stringify({ success: true, invoiceUrl: pendingPayment.invoiceUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })


  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
