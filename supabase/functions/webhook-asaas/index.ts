/// <reference path="./deno.d.ts" />
// supabase/functions/webhook-asaas/index.ts
// Edge Function – Recebe webhooks do Asaas e atualiza o status de assinatura
// Rota PÚBLICA (sem verificação JWT) – valida via Asaas-Access-Token + HMAC
// Deno Deploy runtime (Supabase Edge Functions)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Tipos ───────────────────────────────────────────────────────────────────────

interface AsaasWebhookPayload {
  id?: string
  event: string
  payment?: {
    id: string
    customer: string
    subscription?: string
    installment?: string
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
      return 'active'

    case 'SUBSCRIPTION_CREATED':
      return 'inactive'

    case 'PAYMENT_OVERDUE':
      return 'past_due'

    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
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
    // ── 1. Validar configuração de segurança (obrigatório em produção) ────────
    const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    const WEBHOOK_SECRET = Deno.env.get('ASAAS_WEBHOOK_SECRET')

    if (!WEBHOOK_TOKEN && !WEBHOOK_SECRET) {
      console.error('[webhook-asaas] ERRO CRÍTICO DE SEGURANÇA: Nem ASAAS_WEBHOOK_TOKEN nem ASAAS_WEBHOOK_SECRET estão configurados no ambiente. Rejeitando requisição por segurança.')
      return new Response('Internal Server Error: Webhook security credentials not configured in server environment', { status: 500, headers: corsHeaders })
    }

    // ── 2. Validar Token (se configurado) ─────────────────────────────────────
    if (WEBHOOK_TOKEN) {
      const receivedToken = req.headers.get('asaas-access-token')
      if (!receivedToken || receivedToken !== WEBHOOK_TOKEN) {
        console.warn('[webhook-asaas] Acesso negado: asaas-access-token ausente ou inválido.')
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
      console.log('[webhook-asaas] Token Asaas verificado com sucesso.')
    }

    // ── 3. Ler body cru e verificar assinatura HMAC (se configurada) ──────────
    const rawBody = await req.text()
    if (WEBHOOK_SECRET) {
      const receivedSignature = req.headers.get('x-asaas-signature')
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

    const subIdToSearch = payment?.subscription || payment?.installment || subscription?.id

    // Fallback 1: buscar por subscription_id ou installment_id
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

    // ── 4. Idempotência pré-check (somente leitura antes de mutações) ────────
    if (body.id) {
      const { data: existingEvent } = await supabase
        .from('asaas_webhook_events')
        .select('event_id')
        .eq('event_id', body.id)
        .maybeSingle()

      if (existingEvent) {
        console.log(`[webhook-asaas] Evento ${body.id} (${event}) já processado anteriormente. Ignorando duplicata.`)
        return new Response('ok', { status: 200, headers: corsHeaders })
      }
    }

    // ── 4.5. Auto-provisionamento (pagamento de Payment Link sem escola) ──────
    if (!schoolId && (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED')) {
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

    // Buscar estado atual da escola para proteger contra downgrade em race condition
    const { data: currentSchool } = await supabase
      .from('schools')
      .select('id, subscription_status, plano_ativado_em')
      .eq('id', schoolId)
      .single()

    // Se SUBSCRIPTION_CREATED chegar atrasado quando a escola já está 'active', NÃO sobrescrever
    if (event === 'SUBSCRIPTION_CREATED' && currentSchool?.subscription_status === 'active') {
      console.log(`[webhook-asaas] Escola ${schoolId} já está 'active'. Ignorando SUBSCRIPTION_CREATED tardio.`)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    // Se uma cobrança pendente/substituída for deletada no Asaas enquanto a escola já está ativa,
    // não rebaixar a escola para 'unpaid' (ex.: troca de plano / updatePendingPayments: true).
    if (event === 'PAYMENT_DELETED' && currentSchool?.subscription_status === 'active') {
      console.log(`[webhook-asaas] Escola ${schoolId} já está 'active'. Ignorando downgrade por PAYMENT_DELETED (${payment?.id}).`)
      if (body.id) {
        await supabase.from('asaas_webhook_events').upsert(
          { event_id: body.id, event_type: event, school_id: schoolId },
          { onConflict: 'event_id', ignoreDuplicates: true }
        )
      }
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const updates: Record<string, unknown> = {
      subscription_status: newStatus,
    }

    // Salvar subscription_id ou installment_id se disponível
    const activeSubId = payment?.subscription || payment?.installment || subscription?.id
    if (activeSubId && (newStatus === 'active' || event === 'SUBSCRIPTION_CREATED')) {
      updates.subscription_id = activeSubId
    }

    // Registrar timestamp de ativação (preserva o original se já existir, ou atualiza se vazio)
    if (newStatus === 'active') {
      updates.plano_ativado_em = currentSchool?.plano_ativado_em || new Date().toISOString()
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

    // ── 7. Atualizar tabela payments (se evento de pagamento) ─────────────────
    if (payment?.id) {
      let paymentStatusUpdate: Record<string, unknown> | null = null

      if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        paymentStatusUpdate = {
          status: 'paid',
          paid_at: new Date().toISOString(),
          asaas_payment_id: payment.id,
          ...(payment.invoiceUrl ? { invoice_url: payment.invoiceUrl } : {}),
        }
      } else if (event === 'PAYMENT_OVERDUE') {
        paymentStatusUpdate = {
          status: 'overdue',
          asaas_payment_id: payment.id,
          ...(payment.invoiceUrl ? { invoice_url: payment.invoiceUrl } : {}),
        }
      } else if (
        event === 'PAYMENT_REFUNDED' ||
        event === 'PAYMENT_DELETED' ||
        event === 'PAYMENT_CHARGEBACK_REQUESTED'
      ) {
        paymentStatusUpdate = {
          status: 'refunded',
          asaas_payment_id: payment.id,
        }
      }

      if (paymentStatusUpdate) {
        // Tenta atualizar pelo asaas_payment_id primeiro; se não encontrar, atualiza o registro mais recente da escola
        const { data: updatedByAsaasId, error: errById } = await supabase
          .from('payments')
          .update(paymentStatusUpdate)
          .eq('school_id', schoolId)
          .eq('asaas_payment_id', payment.id)
          .select('id')

        if (!errById && (!updatedByAsaasId || updatedByAsaasId.length === 0)) {
          // Atualiza apenas o registro pendente/em atraso mais recente (nunca sobrescreve registros já 'paid')
          const { data: latestPending } = await supabase
            .from('payments')
            .select('id')
            .eq('school_id', schoolId)
            .in('status', ['pending', 'overdue'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (latestPending?.id) {
            const { error: fallbackPaymentError } = await supabase
              .from('payments')
              .update(paymentStatusUpdate)
              .eq('id', latestPending.id)

            if (fallbackPaymentError) {
              console.warn('[webhook-asaas] Falha ao atualizar payments (fallback):', fallbackPaymentError)
            }
          } else if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
            // Renovação mensal ou parcela subsequente: inserir novo registro em payments
            const { error: insertPaymentError } = await supabase
              .from('payments')
              .insert({
                school_id: schoolId,
                plan: 'school_renewal',
                amount: payment.value ?? 0,
                asaas_subscription_id: payment.subscription || payment.installment || null,
                ...paymentStatusUpdate,
              })

            if (insertPaymentError) {
              console.warn('[webhook-asaas] Falha ao inserir pagamento recorrente:', insertPaymentError)
            }
          }
        } else if (errById) {
          console.warn('[webhook-asaas] Falha ao atualizar payments:', errById)
        } else {
          console.log(`[webhook-asaas] Payments atualizado (${paymentStatusUpdate.status}) para escola ${schoolId}`)
        }
      }
    }

    // ── 8. Registrar idempotência somente após conclusão bem-sucedida ─────────
    if (body.id) {
      const { error: idempError } = await supabase
        .from('asaas_webhook_events')
        .upsert(
          {
            event_id: body.id,
            event_type: event,
            school_id: schoolId,
          },
          { onConflict: 'event_id', ignoreDuplicates: true }
        )
      if (idempError) {
        console.warn('[webhook-asaas] Aviso ao registrar idempotência:', idempError.message)
      }
    }

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

  const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';
  const ASAAS_ENV = Deno.env.get('ASAAS_ENV') || 'production';
  const ASAAS_BASE = ASAAS_ENV === 'sandbox'
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
      // ── Tratamento de Condição de Corrida (Webhooks Duplicados) ─────────────
      // Se 2 webhooks baterem juntos, o 2º falha aqui pois o 1º já criou o auth.
      if (authError?.message?.toLowerCase().includes('already registered') || authError?.status === 422 || authError?.code === 'user_already_exists') {
        console.log(`[webhook-asaas] Race condition detectada para ${email}. Aguardando 2s para tentar recuperar o school_id criado pelo outro webhook...`);
        await new Promise(r => setTimeout(r, 2000));
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('email', email)
          .single();
        
        if (retryProfile?.school_id) {
          // Garante o vínculo do customer_id
          await supabase.from('schools').update({ asaas_customer_id: customerId }).eq('id', retryProfile.school_id);
          return retryProfile.school_id;
        }
      }

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
        subscription_id: payment.subscription || payment.installment || null,
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
      role: 'owner',
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
