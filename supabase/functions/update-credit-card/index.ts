import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || ''
    const ASAAS_ENV = Deno.env.get('ASAAS_ENV') || (Deno.env.get('IS_PRODUCTION') === 'true' ? 'production' : 'production')
    const ASAAS_BASE = ASAAS_ENV === 'sandbox'
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'

    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autorizado.')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Não autorizado.')

    const body = await req.json().catch(() => ({}))
    const requestedSchoolId = body?.schoolId

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('school_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.school_id) {
      return new Response(JSON.stringify({ error: 'Usuário não vinculado a uma escola.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['owner', 'school_admin'].includes(profile.role || '')) {
      return new Response(JSON.stringify({ error: 'Permissão negada. Apenas administradores da escola podem acessar faturas e cartão.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (requestedSchoolId && requestedSchoolId !== profile.school_id) {
      return new Response(JSON.stringify({ error: 'Permissão negada.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targetSchoolId = profile.school_id

    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('subscription_id, asaas_customer_id')
      .eq('id', targetSchoolId)
      .single()

    if (schoolError || !school) {
      throw new Error('Escola não encontrada.')
    }

    if (!school.subscription_id && !school.asaas_customer_id) {
      throw new Error('A escola não possui uma assinatura registrada no Asaas.')
    }

    const subscriptionId = school.subscription_id
    let invoiceUrl: string | null = null

    if (subscriptionId) {
      const baseEndpoint = subscriptionId.startsWith('inst_')
        ? `${ASAAS_BASE}/payments?installment=${subscriptionId}`
        : `${ASAAS_BASE}/subscriptions/${subscriptionId}/payments`

      // 1. Buscar cobrança PENDING ou OVERDUE mais recente
      for (const statusFilter of ['OVERDUE', 'PENDING']) {
        const sep = baseEndpoint.includes('?') ? '&' : '?'
        const res = await fetch(`${baseEndpoint}${sep}status=${statusFilter}`, { headers: asaasHeaders })
        if (res.ok) {
          const data = await res.json()
          if (data.data?.[0]?.invoiceUrl) {
            invoiceUrl = data.data[0].invoiceUrl
            break
          }
        }
      }

      // 2. Fallback: última cobrança gerada da assinatura
      if (!invoiceUrl) {
        const allRes = await fetch(baseEndpoint, { headers: asaasHeaders })
        if (allRes.ok) {
          const allData = await allRes.json()
          if (allData.data?.[0]?.invoiceUrl) {
            invoiceUrl = allData.data[0].invoiceUrl
          }
        }
      }
    }

    // 3. Fallback adicional por customer ou tabela local payments
    if (!invoiceUrl && school.asaas_customer_id) {
      const custRes = await fetch(`${ASAAS_BASE}/payments?customer=${school.asaas_customer_id}`, { headers: asaasHeaders })
      if (custRes.ok) {
        const custData = await custRes.json()
        if (custData.data?.[0]?.invoiceUrl) {
          invoiceUrl = custData.data[0].invoiceUrl
        }
      }
    }

    if (!invoiceUrl) {
      const { data: lastDbPayment } = await supabaseAdmin
        .from('payments')
        .select('invoice_url')
        .eq('school_id', targetSchoolId)
        .not('invoice_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      invoiceUrl = lastDbPayment?.invoice_url || null
    }

    if (!invoiceUrl) {
      throw new Error('Não foi possível localizar uma fatura para esta assinatura no momento.')
    }

    return new Response(JSON.stringify({ success: true, invoiceUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[update-credit-card] Error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
