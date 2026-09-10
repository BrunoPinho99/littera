import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RegisterPublicStudentPayload {
  name: string
  email: string
  password?: string
  school_id: string
  class_id: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: RegisterPublicStudentPayload = await req.json()
    const { name, email, password, school_id, class_id } = payload

    if (!name || !email || !school_id || !class_id) {
      return new Response(JSON.stringify({ error: 'Todos os campos (nome, e-mail, escola e turma) são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 1. Validar se a escola existe
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('name')
      .eq('id', school_id)
      .single()

    if (schoolError || !schoolData) {
      return new Response(JSON.stringify({ error: 'Escola não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Validar se a turma existe e pertence à escola
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, name')
      .eq('id', class_id)
      .eq('school_id', school_id)
      .single()
      
    if (classError || !classData) {
      return new Response(JSON.stringify({ error: 'Turma não encontrada nesta escola' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Criar o Usuário no Auth (se a senha for fornecida, cria com senha, senão gera magic link)
    let authUserId: string | null = null;
    
    if (password) {
      // Criar usuário com senha
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
        }
      })
      
      if (userError) {
        return new Response(JSON.stringify({ error: userError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      authUserId = userData.user.id
    } else {
      // Falha se não tiver senha pois esse fluxo público exige senha inicial para acesso rápido
      return new Response(JSON.stringify({ error: 'Senha é obrigatória no cadastro público' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Update / Insert Profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authUserId,
      full_name: name,
      email: email,
      role: 'student',
      school_id: school_id,
      class_id: class_id,
      status: 'active'
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return new Response(JSON.stringify({ error: 'Erro ao configurar perfil' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Cadastro realizado com sucesso!',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('Unexpected error in register-public-student:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
