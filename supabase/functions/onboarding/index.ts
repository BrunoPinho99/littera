// supabase/functions/onboarding/index.ts
// Edge Function — Fluxo atômico de onboarding self-service para escolas
// Cria: Auth User → School → Profile → Asaas Customer → Subscription → Retorna checkout URL
// Deno Deploy runtime (Supabase Edge Functions)

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Tipos ───────────────────────────────────────────────────────────────────────

interface OnboardingPayload {
  directorName: string
  email: string
  password: string
  schoolName: string
  cnpj: string
  studentCount: number
  billingCycle?: 'MONTHLY' | 'YEARLY'
}

// ── CORS ────────────────────────────────────────────────────────────────────────

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

// ── Validações ──────────────────────────────────────────────────────────────────

function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleaned)) return false

  // Validação dos dígitos verificadores
  const calcDigit = (digits: string, weights: number[]): number => {
    const sum = digits.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0)
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calcDigit(cleaned.substring(0, 12), w1)
  const d2 = calcDigit(cleaned.substring(0, 12) + d1, w2)

  return cleaned.endsWith(`${d1}${d2}`)
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── Handler principal ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405)
  }

  // Variáveis de ambiente
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // @ts-ignore
  const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[onboarding] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada')
    return jsonResponse({ error: 'Configuração de banco de dados ausente no servidor.' }, 500)
  }

  if (!ASAAS_KEY) {
    console.error('[onboarding] ASAAS_API_KEY não configurada')
    return jsonResponse({ error: 'Configuração de pagamento ausente no servidor.' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const ASAAS_BASE = ASAAS_KEY.includes('hmlg')
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'

  const asaasHeaders = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_KEY,
  }

  // IDs criados (para rollback em caso de erro)
  let createdAuthUserId: string | null = null
  let createdSchoolId: string | null = null

  try {
    // ── 1. Parse e validação do payload ──────────────────────────────────────
    const body: OnboardingPayload = await req.json()

    const { directorName, email, password, schoolName, cnpj, studentCount, billingCycle } = body

    // Cálculo do preço no servidor
    const isYearly = billingCycle === 'YEARLY'
    const discount = isYearly ? 0.8 : 1
    const pricePerStudent = studentCount <= 200 ? 9 * discount : 7 * discount
    const planId = studentCount <= 200 ? 'starter' : 'school'
    const monthlyTotal = studentCount * pricePerStudent
    const planPrice = isYearly ? monthlyTotal * 12 : monthlyTotal

    // Validações
    if (!directorName || directorName.trim().length < 3) {
      return jsonResponse({ error: 'Nome do diretor deve ter pelo menos 3 caracteres.' }, 400)
    }
    if (!validateEmail(email)) {
      return jsonResponse({ error: 'Formato de e-mail inválido.' }, 400)
    }
    if (!password || password.length < 6) {
      return jsonResponse({ error: 'A senha deve ter pelo menos 6 caracteres.' }, 400)
    }
    if (!schoolName || schoolName.trim().length < 2) {
      return jsonResponse({ error: 'Nome da escola é obrigatório.' }, 400)
    }

    const cleanCnpj = cnpj.replace(/\D/g, '')
    if (!validateCNPJ(cleanCnpj)) {
      return jsonResponse({ error: 'CNPJ inválido. Verifique os dígitos.' }, 400)
    }

    if (!studentCount || studentCount < 1) {
      return jsonResponse({ error: 'Quantidade de alunos deve ser pelo menos 1.' }, 400)
    }

    // ── 2. Criar usuário no Supabase Auth ───────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirma para não bloquear o fluxo
      user_metadata: {
        full_name: directorName.trim(),
        user_type: 'school_admin',
      },
    })

    if (authError || !authData.user) {
      console.error('[onboarding] Erro ao criar auth user:', authError)
      const msg = authError?.message?.includes('already registered')
        ? 'Este e-mail já está cadastrado. Faça login.'
        : 'Erro ao criar conta. Tente novamente.'
      return jsonResponse({ error: msg }, 422)
    }

    createdAuthUserId = authData.user.id
    console.log(`[onboarding] Auth user criado: ${createdAuthUserId}`)

    // ── 4. Criar escola no banco ────────────────────────────────────────────
    const slug = schoolName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: schoolName.trim(),
        slug: slug || `escola-${Date.now()}`,
        cnpj: cleanCnpj,
        student_count: studentCount,
      })
      .select()
      .single()

    if (schoolError || !schoolData) {
      console.error('[onboarding] Erro ao criar escola:', schoolError)
      // Rollback: deletar auth user
      await supabase.auth.admin.deleteUser(createdAuthUserId)
      return jsonResponse({ error: 'Erro ao registrar dados da escola.' }, 422)
    }

    createdSchoolId = schoolData.id
    console.log(`[onboarding] Escola criada: ${createdSchoolId}`)

    // ── 5. Criar profile vinculando diretor → escola ────────────────────────
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: createdAuthUserId,
      full_name: directorName.trim(),
      email: email.toLowerCase().trim(),
      role: 'school_admin',
      school_id: createdSchoolId,
      status: 'active',
    })

    if (profileError) {
      console.error('[onboarding] Erro ao criar profile:', profileError)
      // Não é fatal — tenta continuar
    }

    // ── 6. Atualizar user_metadata com school_id ────────────────────────────
    await supabase.auth.admin.updateUserById(createdAuthUserId, {
      user_metadata: {
        full_name: directorName.trim(),
        user_type: 'school_admin',
        school_id: createdSchoolId,
      },
    })

    // ── 7. Criar Customer no Asaas ──────────────────────────────────────────
    let asaasCustomerId: string | null = null

    // Tenta encontrar por CNPJ primeiro
    const searchRes = await fetch(
      `${ASAAS_BASE}/customers?cpfCnpj=${cleanCnpj}`,
      { headers: asaasHeaders }
    )
    
    if (searchRes.ok) {
      const searchData = await searchRes.json()
      if (searchData.data?.length > 0) {
        asaasCustomerId = searchData.data[0].id
      }
    }

    if (!asaasCustomerId) {
      const createCustomerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: schoolName.trim(),
          cpfCnpj: cleanCnpj,
          email: email.toLowerCase().trim(),
          externalReference: createdSchoolId,
        }),
      })

      const customerData = await createCustomerRes.json()

      if (!createCustomerRes.ok) {
        const errorMsg = customerData.errors?.[0]?.description || 'Erro ao criar cliente no gateway.'
        console.error('[onboarding] Asaas customer error:', customerData)
        // Não faz rollback aqui — escola já está criada, admin pode pagar depois
        return jsonResponse({
          error: errorMsg,
          partialSuccess: true,
          message: 'Conta criada com sucesso, mas houve um erro ao gerar o link de pagamento. Faça login e tente novamente.',
        }, 422)
      }

      asaasCustomerId = customerData.id
    }

    // Salvar asaas_customer_id na escola
    await supabase
      .from('schools')
      .update({ asaas_customer_id: asaasCustomerId })
      .eq('id', createdSchoolId)

    // ── 8. Criar assinatura no Asaas ────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: planPrice,
        nextDueDate: today,
        cycle: isYearly ? 'YEARLY' : 'MONTHLY',
        description: `Assinatura Littera – Plano ${planId} (${studentCount} alunos)`,
        externalReference: createdSchoolId,
      }),
    })

    const subData = await subRes.json()

    if (!subRes.ok) {
      const errorMsg = subData.errors?.[0]?.description || 'Erro ao criar assinatura.'
      console.error('[onboarding] Asaas subscription error:', subData)
      return jsonResponse({
        error: errorMsg,
        partialSuccess: true,
        message: 'Conta criada, mas falha ao gerar pagamento. Faça login para tentar novamente.',
      }, 422)
    }

    const subscriptionId = subData.id

    // Salvar subscription_id
    await supabase
      .from('schools')
      .update({ subscription_id: subscriptionId })
      .eq('id', createdSchoolId)

    // ── 9. Obter URL da primeira cobrança ───────────────────────────────────
    const paymentsRes = await fetch(
      `${ASAAS_BASE}/payments?subscription=${subscriptionId}`,
      { headers: asaasHeaders }
    )
    
    let checkoutUrl = `https://www.asaas.com/c/${asaasCustomerId}`

    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json()
      if (paymentsData.data?.length > 0) {
        checkoutUrl = paymentsData.data[0].invoiceUrl
      }
    }

    console.log(`[onboarding] Onboarding completo! School: ${createdSchoolId}, Checkout: ${checkoutUrl}`)

    // ── 10. Retorno final ───────────────────────────────────────────────────
    return jsonResponse({
      success: true,
      checkoutUrl,
      schoolId: createdSchoolId,
      subscriptionId,
      message: 'Conta criada com sucesso! Redirecionando para pagamento.',
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.'
    console.error('[onboarding] Erro não tratado:', error)

    // Rollback em caso de erro catastrófico
    if (createdSchoolId) {
      await supabase.from('schools').delete().eq('id', createdSchoolId).catch(() => {})
    }
    if (createdAuthUserId) {
      await supabase.auth.admin.deleteUser(createdAuthUserId).catch(() => {})
    }

    return jsonResponse({ error: message }, 500)
  }
})
