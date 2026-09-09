
import { createClient } from '@supabase/supabase-js'

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
  const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Configuração de banco de dados ausente.' })
  }

  if (!ASAAS_KEY) {
    return jsonResponse({ error: 'Configuração de pagamento ausente.' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

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
    const { directorName, email, password, schoolName, cnpj, cpf, studentCount, billingCycle, whatsapp, postalCode, addressNumber, paymentMethod } = body

    // Auto-complete endereço via ViaCEP
    let endereco = '', bairro = '', cidade = '', estado = ''
    if (postalCode) {
      try {
        const cepClean = postalCode.replace(/\D/g, '')
        const viacepRes = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`)
        if (viacepRes.ok) {
          const viacepData = await viacepRes.json()
          if (!viacepData.erro) {
            endereco = viacepData.logradouro || ''
            bairro = viacepData.bairro || ''
            cidade = viacepData.localidade || ''
            estado = viacepData.uf || ''
          }
        }
      } catch (e) {
        console.warn('[process-subscription] ViaCEP lookup failed:', e)
      }
    }

    // 1. Cálculo de preço
    const isYearly = billingCycle === 'YEARLY'
    const discount = isYearly ? 0.6 : 1
    
    let pricePerStudent = 0;
    if (studentCount <= 200) pricePerStudent = 8.90;
    else if (studentCount <= 500) pricePerStudent = 7.90;
    else if (studentCount <= 1000) pricePerStudent = 6.90;
    else pricePerStudent = 5.90;

    pricePerStudent = pricePerStudent * discount;
    const planId = 'school'
    const monthlyTotal = studentCount * pricePerStudent
    const planPrice = isYearly ? monthlyTotal * 12 : monthlyTotal

    // 2. Buscar ou Criar Customer no Asaas
    let asaasCustomerId = null
    const searchRes = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cnpj}`, { headers: asaasHeaders })
    if (searchRes.ok) {
      const searchData = await searchRes.json()
      if (searchData.data?.length > 0) asaasCustomerId = searchData.data[0].id
    }

    const customerPayload = {
      name: schoolName,
      cpfCnpj: cpf || cnpj,
      email: email,
      phone: whatsapp,
      mobilePhone: whatsapp,
      postalCode: postalCode?.replace(/\D/g, ''),
      address: endereco,
      addressNumber: addressNumber || "0",
      province: bairro,
      city: cidade,
      state: estado,
      externalReference: email,
      notificationDisabled: true
    }

    if (!asaasCustomerId) {
      const createCustomerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify(customerPayload),
      })
      const customerData = await createCustomerRes.json()
      if (!createCustomerRes.ok) {
        return jsonResponse({ error: customerData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.' })
      }
      asaasCustomerId = customerData.id
    } else {
      await fetch(`${ASAAS_BASE}/customers/${asaasCustomerId}`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify(customerPayload),
      }).catch(e => console.warn('[process-subscription] Falha ao atualizar cliente existente:', e))
    }

    // 3. Opcional: Auto-complete endereço via ViaCEP (agora já foi feito acima)
    // A criação da cobrança (Subscription ou Installment) será feita na Edge Function `pay-subscription` 
    // com base no customerId gerado aqui.

    // CONTA CRIADA E CLIENTE PRONTO! Agora criamos o usuário no banco.

    // 4. Criar ou Recuperar usuário no Supabase Auth
    let createdAuthUserId = null;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: directorName.trim(),
        user_type: 'school_admin',
      },
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered') || authError.status === 422) {
        // Se o usuário já existe, tentamos fazer login para validar a senha
        // IMPORTANTE: Usa um client separado para não alterar a sessão do client admin
        const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        })
        const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });

        if (signInError) {
          return jsonResponse({ error: 'Este e-mail já está cadastrado. Se for você, a senha está incorreta. Faça login ou recupere a senha.' })
        }
        createdAuthUserId = signInData.user.id;
      } else {
        // Algum outro erro real de criação (senha fraca, rate limit, etc)
        console.error('[process-subscription] Error creating user:', authError)
        return jsonResponse({ error: `Erro ao criar usuário: ${authError.message}` })
      }
    } else {
      createdAuthUserId = authData.user.id;
    }

    if (!createdAuthUserId) {
      return jsonResponse({ error: 'Erro crítico ao obter ID do usuário.' })
    }

    // 5. Verificar se o usuário já tem uma escola vinculada
    const { data: existingProfile } = await supabase.from('profiles').select('school_id').eq('id', createdAuthUserId).single();
    let createdSchoolId = existingProfile?.school_id;

    if (!createdSchoolId) {
      // Verificar se já existe escola com este CNPJ (tentativa anterior)
      const { data: existingSchool } = await supabase
        .from('schools')
        .select('id')
        .eq('cnpj', cnpj)
        .single()

      if (existingSchool) {
        // Escola já existe — atualizar dados (cliente Asaas)
        createdSchoolId = existingSchool.id
        await supabase.from('schools').update({
          asaas_customer_id: asaasCustomerId,
          student_count: studentCount,
          subscription_status: 'inactive'
        }).eq('id', createdSchoolId)
      } else {
        // Inserir Escola Nova
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .insert({
            name: schoolName.trim(),
            cnpj: cnpj,
            email: email.toLowerCase().trim(),
            student_count: studentCount,
            asaas_customer_id: asaasCustomerId,
            subscription_status: 'inactive',
            cep: postalCode?.replace(/\D/g, ''),
            numero: addressNumber,
            endereco: endereco,
            bairro: bairro,
            cidade: cidade,
            estado: estado,
          })
          .select()
          .single()

        if (schoolError || !schoolData) {
          return jsonResponse({ error: `Usuário autenticado, mas erro ao salvar escola: ${schoolError?.message || 'Desconhecido'}` })
        }
        createdSchoolId = schoolData.id
      }
    } else {
      // Usuário já tem escola, apenas atualizamos a referência do Asaas
      await supabase.from('schools').update({
        asaas_customer_id: asaasCustomerId,
      }).eq('id', createdSchoolId);
    }

    // 6. Criar ou Atualizar Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: createdAuthUserId,
        school_id: createdSchoolId,
        email: email.toLowerCase().trim(),
        full_name: directorName.trim(),
        role: 'owner',
        cpf: cpf?.replace(/\D/g, ''),
        whatsapp: whatsapp?.replace(/\D/g, ''),
      })
      
      if (profileError) {
      return jsonResponse({ error: `Usuário criado, escola salva, mas erro no perfil: ${profileError.message}` })
    }

    // IMPORTANTE: incluir user_type para não sobrescrever o valor existente
    await supabase.auth.admin.updateUserById(createdAuthUserId, {
      user_metadata: {
        user_type: 'school_admin',
        school_id: createdSchoolId,
        full_name: directorName.trim(),
      },
    })

    return jsonResponse({
      success: true,
      schoolId: createdSchoolId,
      userId: createdAuthUserId,
      message: 'Conta criada com sucesso!'
    })

  } catch (err: unknown) {
    console.error('Error process-subscription:', err)
    const message = err instanceof Error ? err.message : 'Erro interno no servidor de pagamento'
    return jsonResponse({ error: message || 'Erro interno no servidor de pagamento' })
  }
})
