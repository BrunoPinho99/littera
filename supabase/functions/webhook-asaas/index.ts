/// <reference path="./deno.d.ts" />
// supabase/functions/webhook-asaas/index.ts
// Edge Function – Recebe webhooks do Asaas e atualiza o status de assinatura
// Rota PÚBLICA (sem verificação JWT) – valida via Asaas-Access-Token + HMAC
// Deno Deploy runtime (Supabase Edge Functions)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Tipos ───────────────────────────────────────────────────────────────────────

interface AsaasWebhookPayload {
  event: string
  payment?: {
    id: string
    customer: string
    subscription?: string
    externalReference?: string
    invoiceUrl?: string
    value?: number
    status?: string
  }
  subscription?: {
    id: string
    customer: string
    externalReference?: string
    value?: number
    status?: string
  }
}

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'inactive'

// ── Mapeamento de evento → status ───────────────────────────────────────────────

function mapEventToStatus(event: string): SubscriptionStatus | null {
  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
    case 'SUBSCRIPTION_CREATED':
      return 'active'

    case 'PAYMENT_OVERDUE':
      return 'past_due'

    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      return 'unpaid'

    case 'SUBSCRIPTION_DELETED':
    case 'SUBSCRIPTION_INACTIVATED':
      return 'canceled'

    default:
      return null
  }
}

// ── Verificação HMAC-SHA256 ─────────────────────────────────────────────────────

async function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Comparação em tempo constante para evitar timing attacks
    if (signature.length !== expectedSignature.length) return false
    let mismatch = 0
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
    }
    return mismatch === 0
  } catch {
    return false
  }
}

// ── CORS ────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token, x-asaas-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Handler principal ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // ── 1. Validar token de autenticação do Asaas ─────────────────────────────
    const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    const receivedToken = req.headers.get('asaas-access-token')
    
    if (!WEBHOOK_TOKEN || receivedToken !== WEBHOOK_TOKEN) {
      console.warn('[webhook-asaas] Token inválido recebido:', receivedToken?.substring(0, 8) + '...')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // ── 2. Ler body cru e verificar assinatura HMAC (se configurada) ──────────
    const rawBody = await req.text()
    const WEBHOOK_SECRET = Deno.env.get('ASAAS_WEBHOOK_SECRET')
    const receivedSignature = req.headers.get('x-asaas-signature')

    if (WEBHOOK_SECRET) {
      if (!receivedSignature) {
        console.warn('[webhook-asaas] HMAC configurado mas header x-asaas-signature ausente.')
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }

      const isValid = await verifyHmacSignature(rawBody, receivedSignature, WEBHOOK_SECRET)
      if (!isValid) {
        console.warn('[webhook-asaas] Assinatura HMAC inválida.')
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }

      console.log('[webhook-asaas] Assinatura HMAC verificada com sucesso.')
    }

    // ── 3. Parse do payload ───────────────────────────────────────────────────
    const body: AsaasWebhookPayload = JSON.parse(rawBody)
    const { event, payment, subscription } = body

    // Asaas envia os dados no campo 'payment' para eventos de cobrança
    // E no campo 'subscription' para eventos de assinatura
    const entity = payment || subscription

    console.log(`[webhook-asaas] Evento recebido: ${event}`, {
      entityId: entity?.id,
      customer: entity?.customer,
      subscription: payment?.subscription || subscription?.id,
      externalReference: entity?.externalReference,
    })

    if (!entity) {
      console.log('[webhook-asaas] Payload sem payment/subscription, ignorando.')
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    // ── 3. Resolver o school_id ───────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let schoolId: string | null = entity.externalReference || null

    const subIdToSearch = payment?.subscription || subscription?.id

    // Fallback 1: buscar por subscription_id
    if (!schoolId && subIdToSearch) {
      const { data } = await supabase
        .from('schools')
        .select('id')
        .eq('subscription_id', subIdToSearch)
        .single()
      if (data) schoolId = data.id
    }

    // Fallback 2: buscar por asaas_customer_id
    if (!schoolId && entity.customer) {
      const { data } = await supabase
        .from('schools')
        .select('id')
        .eq('asaas_customer_id', entity.customer)
        .single()
      if (data) schoolId = data.id
    }

    // ── 4. Auto-provisionamento (pagamento de Payment Link sem escola) ────────
    if (!schoolId && (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED' || event === 'SUBSCRIPTION_CREATED')) {
      schoolId = await autoProvisionSchool(supabase, entity as NonNullable<AsaasWebhookPayload['payment']>)
    }

    if (!schoolId) {
      console.warn('[webhook-asaas] Não foi possível identificar a escola. Ignorando evento.')
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    // ── 5. Mapear evento → atualização ────────────────────────────────────────
    const newStatus = mapEventToStatus(event)

    if (!newStatus) {
      console.log(`[webhook-asaas] Evento ${event} não requer atualização de status.`)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const updates: Record<string, unknown> = {
      subscription_status: newStatus,
    }

    // Salvar subscription_id se disponível e ativando
    if (payment?.subscription && (newStatus === 'active')) {
      updates.subscription_id = payment.subscription
    }

    // Registrar timestamp de ativação
    if (newStatus === 'active') {
      updates.plano_ativado_em = new Date().toISOString()
    }

    // ── 6. Aplicar update no banco ────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('schools')
      .update(updates)
      .eq('id', schoolId)

    if (updateError) {
      console.error('[webhook-asaas] Erro ao atualizar escola:', updateError)
      return new Response(
        JSON.stringify({ error: 'Falha ao atualizar escola', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[webhook-asaas] Escola ${schoolId} atualizada: status → ${newStatus}`)

    return new Response('ok', { status: 200, headers: corsHeaders })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[webhook-asaas] Erro no processamento:', message)
    return new Response(
      JSON.stringify({ error: 'Erro interno no processamento do webhook', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ── Auto-provisioning: cria escola + conta quando pagamento chega sem vínculo ──

async function autoProvisionSchool(
  supabase: SupabaseClient,
  payment: NonNullable<AsaasWebhookPayload['payment']>
): Promise<string | null> {
  const customerId = payment.customer
  if (!customerId) return null

  const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')!
  const ASAAS_BASE = ASAAS_KEY.includes('hmlg')
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'

  try {
    // Buscar dados do cliente no Asaas
    const customerRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, {
      headers: { 'access_token': ASAAS_KEY },
    })

    if (!customerRes.ok) {
      console.error('[webhook-asaas] Falha ao buscar customer no Asaas')
      return null
    }

    const customerData = await customerRes.json()
    const email: string | undefined = customerData.email
    const name: string = customerData.name || 'Escola'

    if (!email) {
      console.error('[webhook-asaas] Customer sem email, impossível criar conta.')
      return null
    }

    // Verificar se já existe perfil com esse email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, school_id')
      .eq('email', email)
      .single()

    if (existingProfile?.school_id) {
      // Vincular asaas_customer_id à escola existente
      await supabase
        .from('schools')
        .update({ asaas_customer_id: customerId })
        .eq('id', existingProfile.school_id)
      return existingProfile.school_id
    }

    // Criar usuário auth com senha temporária
    const tempPassword = crypto.randomUUID()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { user_type: 'school_admin' },
    })

    if (authError || !authData.user) {
      console.error('[webhook-asaas] Erro ao criar auth user:', authError)
      return null
    }

    const userId = authData.user.id

    // Criar escola
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: name,
        city: 'Não informada',
        subscription_status: 'active',
        subscription_id: payment.subscription || null,
        asaas_customer_id: customerId,
        plano_ativado_em: new Date().toISOString(),
      })
      .select()
      .single()

    if (schoolError || !schoolData) {
      console.error('[webhook-asaas] Erro ao criar escola:', schoolError)
      return null
    }

    const schoolId = schoolData.id

    // Atualizar metadata do auth com school_id
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { user_type: 'school_admin', school_id: schoolId },
    })

    // Criar profile
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: name,
      email: email,
      role: 'school_admin',
      school_id: schoolId,
      status: 'active',
    })

    console.log(`[webhook-asaas] Auto-provisionamento: escola ${schoolId} criada para ${email}`)
    return schoolId

  } catch (error: unknown) {
    console.error('[webhook-asaas] Erro no auto-provisionamento:', error)
    return null
  }
}
