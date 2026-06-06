import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')!
const ASAAS_URL = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, cpfCnpj, newPassword } = await req.json()

    if (!email || !cpfCnpj || !newPassword) {
      return new Response(JSON.stringify({ error: 'Preencha todos os campos.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Validar no Asaas se esse email e CPF/CNPJ pertencem a um cliente válido
    const customerRes = await fetch(`${ASAAS_URL}/customers?email=${email}&cpfCnpj=${cpfCnpj}`, {
      headers: { 'access_token': ASAAS_KEY }
    })
    
    if (!customerRes.ok) {
      return new Response(JSON.stringify({ error: 'Erro ao validar dados no gateway de pagamento.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const customerData = await customerRes.json()
    if (!customerData.data || customerData.data.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum pagamento encontrado com este Email e CPF/CNPJ. Tem certeza que os dados estão corretos e o pagamento foi concluído?' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    // 2. Buscar o usuário no banco de dados (profile)
    const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('email', email).single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Sua conta ainda não foi criada. O pagamento pode estar em processamento. Aguarde alguns instantes e tente novamente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    // 3. Atualizar a senha via Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
      password: newPassword
    })

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Erro ao configurar a senha.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
