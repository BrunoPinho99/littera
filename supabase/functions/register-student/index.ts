import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RegisterStudentPayload {
  action?: 'check' | 'register'
  name?: string
  email?: string
  whatsapp?: string
  invite_code: string
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

    const payload: RegisterStudentPayload = await req.json()
    const { action = 'register', name, whatsapp, invite_code } = payload
    const email = (payload.email || '').trim().toLowerCase()

    if (!invite_code) {
      return new Response(JSON.stringify({ error: 'Código da turma é obrigatório' }), {
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

    // 1. Check if class exists and get details
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, name, school_id, max_students, trial_ends_at, schools(name, is_trial_school, subscription_status, student_count)')
      .eq('invite_code', invite_code)
      .maybeSingle()

    if (classError || !classData) {
      return new Response(JSON.stringify({ error: 'Turma não encontrada ou código inválido' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { id: class_id, name: class_name, school_id, max_students, trial_ends_at, schools } = classData

    type SchoolData = {
      name: string;
      is_trial_school: boolean;
      subscription_status?: string;
      student_count?: number;
    };
    const schoolData = Array.isArray(schools) ? (schools[0] as SchoolData) : (schools as SchoolData | null);
    const school_name = schoolData?.name || 'Escola'
    const school_status = String(schoolData?.subscription_status || '').toLowerCase()
    const is_trial = schoolData?.is_trial_school === true || school_status === 'trialing'

    if (!['active', 'trialing'].includes(school_status)) {
      return new Response(JSON.stringify({ error: 'Esta instituição não está com acesso ativo no momento.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Check class capacity and school seat limit
    const { count: classCount, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', class_id)
      .eq('role', 'student')

    let isClassFull = !countError && classCount !== null && max_students != null && max_students > 0 && classCount >= max_students

    if (!isClassFull && !is_trial && (schoolData?.student_count ?? 0) > 0) {
      const { count: schoolStudentCount } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school_id)
        .eq('role', 'student')

      if (schoolStudentCount !== null && schoolStudentCount >= (schoolData?.student_count ?? 0)) {
        isClassFull = true
      }
    }

    if (action === 'check') {
      return new Response(JSON.stringify({
        success: true,
        class_name,
        school_name,
        is_full: isClassFull,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Action: register ---
    if (isClassFull) {
      return new Response(JSON.stringify({ error: 'Turma ou escola já atingiu o limite de vagas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!email || !whatsapp || !name) {
      return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'E-mail inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const whatsappRegex = /^\d{2}9\d{8}$/
    const cleanWhatsapp = whatsapp.replace(/\D/g, '')
    if (!whatsappRegex.test(cleanWhatsapp)) {
      return new Response(JSON.stringify({ error: 'WhatsApp inválido. Deve ter DDD + 9 dígitos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Check if email or whatsapp already used a trial (only for trial schools)
    if (is_trial) {
      const { data: existingTrial } = await supabaseAdmin
        .from('trial_history')
        .select('id')
        .or(`email.eq.${email},whatsapp.eq.${cleanWhatsapp}`)
        .maybeSingle()

      if (existingTrial) {
        return new Response(JSON.stringify({ error: 'Trial já utilizado por este e-mail ou WhatsApp' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Check existing profile to prevent cross-tenant hijack
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, school_id, status, role')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile && existingProfile.school_id && existingProfile.school_id !== school_id && existingProfile.status !== 'invited') {
      return new Response(JSON.stringify({ error: 'Este e-mail já está vinculado a outra instituição.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Generate Invite Link redirecting to /convite so student defines password
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br'
    const userMetadata = {
      full_name: name.trim(),
      user_type: 'student',
      school_id: school_id,
      school_name: school_name,
      class_id: class_id,
      invited_by_school: school_name,
    }

    if (existingProfile?.status === 'invited' && existingProfile.id) {
      await supabaseAdmin.auth.admin.deleteUser(existingProfile.id).catch(() => {})
      await supabaseAdmin.from('profiles').delete().eq('id', existingProfile.id)
    }

    let userId: string
    let actionLink: string
    let profileStatus: 'invited' | 'active' = 'invited'

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${siteUrl}/convite`,
        data: userMetadata,
      },
    })

    if (!inviteError && inviteData?.user?.id) {
      userId = inviteData.user.id
      actionLink = inviteData.properties.action_link
      profileStatus = 'invited'
    } else if (
      inviteError?.message?.includes('already been registered') ||
      inviteError?.message?.includes('already registered') ||
      inviteError?.code === 'email_exists'
    ) {
      if (!existingProfile?.id) {
        return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado. Faça login na plataforma.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = existingProfile.id
      profileStatus = 'active'
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: userMetadata })

      const { data: magicLinkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${siteUrl}/login`,
          data: userMetadata,
        },
      })
      if (linkError || !magicLinkData?.user) {
        return new Response(JSON.stringify({ error: 'Erro ao gerar acesso' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      actionLink = magicLinkData.properties.action_link
    } else {
      console.error('Error generating invite link:', inviteError)
      return new Response(JSON.stringify({ error: 'Erro ao gerar acesso' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Update / Insert Profile
    const now = new Date()
    const computedTrialEnd = trial_ends_at
      ? new Date(trial_ends_at).toISOString()
      : new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: name.trim(),
      email: email,
      role: 'student',
      school_id: school_id,
      class_id: class_id,
      status: profileStatus,
      is_trial: is_trial,
      ...(is_trial ? {
        trial_started_at: now.toISOString(),
        trial_ends_at: computedTrialEnd,
        trial_school_name: school_name,
        originated_from_trial: true,
      } : {})
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    // 6. Insert into trial_history
    if (is_trial) {
      await supabaseAdmin.from('trial_history').insert({
        email: email,
        whatsapp: cleanWhatsapp,
        auth_user_id: userId,
        school_name: school_name,
      })
    }

    // 7. Send Activation Link to Student via Brevo
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (brevoApiKey) {
      const studentHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Bem-vindo ao Littera! 🚀</h2>
          <p>Olá ${name},</p>
          <p>Seu acesso à plataforma pela escola <strong>${school_name}</strong> foi liberado!</p>
          ${is_trial ? '<p>Você tem direito a enviar 2 redações por dia civil e receber correções ultra-detalhadas instantaneamente.</p>' : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionLink}" style="background-color: #111315; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Ativar Minha Conta Agora
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Se o botão não funcionar, cole este link no navegador:<br>${actionLink}</p>
        </div>
      `

      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': brevoApiKey,
          },
          body: JSON.stringify({
            sender: { name: 'Littera', email: Deno.env.get('BREVO_SENDER_EMAIL') || 'contato@littera.com.br' },
            to: [{ email: email, name: name }],
            subject: is_trial ? 'Seu Teste Gratuito de Redação Começou! | Littera' : 'Acesso Liberado! | Littera',
            htmlContent: studentHtml
          }),
        })
      } catch (studentErr) {
        console.error('Error sending welcome email to student:', studentErr)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Cadastro realizado com sucesso! Verifique seu e-mail para ativar sua conta.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('Unexpected error in register-student:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
