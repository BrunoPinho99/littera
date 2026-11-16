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
    const { name, password, school_id, class_id } = payload
    const email = (payload.email || '').trim().toLowerCase()

    if (!name || !email || !school_id || !class_id) {
      return new Response(JSON.stringify({ error: 'Todos os campos (nome, e-mail, escola e turma) são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Senha com mínimo de 6 caracteres é obrigatória no cadastro público' }), {
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

    // 1. Validar se a escola existe e está com assinatura ativa ou trial
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('name, subscription_status, student_count, is_trial_school')
      .eq('id', school_id)
      .single()

    if (schoolError || !schoolData) {
      return new Response(JSON.stringify({ error: 'Escola não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const schoolStatus = String(schoolData.subscription_status || '').toLowerCase()
    if (!['active', 'trialing'].includes(schoolStatus)) {
      return new Response(JSON.stringify({ error: 'Esta instituição não está com assinatura ativa no momento.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Validar se a turma existe e pertence à escola
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, name, max_students')
      .eq('id', class_id)
      .eq('school_id', school_id)
      .single()

    if (classError || !classData) {
      return new Response(JSON.stringify({ error: 'Turma não encontrada nesta escola' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2.5. Validar limite de alunos da escola e da turma
    const maxSchoolStudents = schoolData.student_count ?? 0
    if (maxSchoolStudents > 0) {
      const { count: currentSchoolStudents } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school_id)
        .eq('role', 'student')

      if (currentSchoolStudents !== null && currentSchoolStudents >= maxSchoolStudents) {
        return new Response(JSON.stringify({ error: 'Limite de alunos contratado pela instituição foi atingido.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (classData.max_students != null && classData.max_students > 0) {
      const { count: currentClassStudents } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', class_id)
        .eq('role', 'student')

      if (currentClassStudents !== null && currentClassStudents >= classData.max_students) {
        return new Response(JSON.stringify({ error: 'Esta turma já atingiu o limite máximo de vagas.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 3. Criar o Usuário no Auth com metadados completos
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: name.trim(),
        user_type: 'student',
        school_id: school_id,
        school_name: schoolData.name,
        class_id: class_id,
      }
    })

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: userError?.message || 'Erro ao criar usuário' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authUserId = userData.user.id
    const isTrialSchool = schoolData.is_trial_school === true || schoolStatus === 'trialing'

    // 4. Update / Insert Profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authUserId,
      full_name: name.trim(),
      email: email,
      role: 'student',
      school_id: school_id,
      class_id: class_id,
      status: 'active',
      is_trial: isTrialSchool,
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error updating profile:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {})
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
