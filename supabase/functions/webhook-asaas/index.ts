import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')!
const ASAAS_URL = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3'

serve(async (req) => {
  try {
    const body = await req.json()
    const event = body.event
    const payment = body.payment

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // A chave para identificar a escola
    let schoolId = payment?.externalReference || payment?.subscription?.externalReference

    if (!schoolId && (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED')) {
      // Veio de um Link de Pagamento (sem externalReference)
      // Precisamos criar a Escola e o Usuário
      const customerId = payment.customer
      if (customerId) {
        // 1. Busca dados do cliente no Asaas
        const customerRes = await fetch(`${ASAAS_URL}/customers/${customerId}`, {
          headers: { 'access_token': ASAAS_KEY }
        })
        if (customerRes.ok) {
          const customerData = await customerRes.json()
          const email = customerData.email
          const name = customerData.name
          const cpfCnpj = customerData.cpfCnpj

          if (email) {
            // Verifica se o usuário já existe
            const { data: existingUser } = await supabase.from('profiles').select('id, school_id').eq('email', email).single()
            
            if (existingUser) {
              schoolId = existingUser.school_id
            } else {
              // Cria Usuário no Auth (com senha aleatória, pois ele vai redefinir depois)
              const tempPassword = crypto.randomUUID()
              const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: { user_type: 'school_admin' }
              })

              if (!authError && authData.user) {
                const userId = authData.user.id

                // Cria Escola
                const { data: schoolData } = await supabase.from('schools').insert({
                  name: name || 'Escola (Atualize o nome)',
                  city: 'Não informada',
                  subscription_status: 'active',
                  subscription_id: payment.subscription || null
                }).select().single()

                if (schoolData) {
                  schoolId = schoolData.id
                  
                  // Atualiza metadata do auth
                  await supabase.auth.admin.updateUserById(userId, {
                    user_metadata: { user_type: 'school_admin', school_id: schoolId }
                  })

                  // Cria Profile
                  await supabase.from('profiles').insert({
                    id: userId,
                    firstName: name ? name.split(' ')[0] : 'Gestor',
                    lastName: name ? name.split(' ').slice(1).join(' ') : '',
                    email: email,
                    user_type: 'school_admin',
                    school_id: schoolId
                  })
                }
              }
            }
          }
        }
      }
    }

    if (!schoolId) {
      return new Response('ok', { status: 200 }) // ignorar pagamentos sem vínculo que não conseguimos criar conta
    }

    const atualizacoes: Record<string, unknown> = {}

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        atualizacoes.subscription_status = 'active'
        atualizacoes.plano_ativado_em = new Date().toISOString()
        break
      case 'PAYMENT_OVERDUE':
        atualizacoes.subscription_status = 'inactive'
        break
      case 'PAYMENT_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
      case 'PAYMENT_REFUNDED':
        atualizacoes.subscription_status = 'inactive'
        atualizacoes.plano = 'free'
        break
    }

    if (Object.keys(atualizacoes).length > 0) {
      const { error } = await supabase.from('schools')
        .update(atualizacoes)
        .eq('id', schoolId)

      if (error) {
        console.error('Erro ao atualizar DB:', error)
      }
    }

    return new Response('ok', { status: 200 })
  } catch (error: any) {
    console.error('Erro no processamento do webhook:', error)
    return new Response('ok', { status: 200 })
  }
})
