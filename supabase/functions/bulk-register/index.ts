import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface BulkUser {
  name: string
  email: string
  role: 'student' | 'teacher'
}

interface BulkRegisterPayload {
  users: BulkUser[]
  school_id: string
  class_id?: string
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

    const payload: BulkRegisterPayload = await req.json()
    const { users, school_id, class_id } = payload

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum usuário fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!school_id) {
      return new Response(JSON.stringify({ error: 'ID da escola é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validação do School ID e Role
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('school_id, role')
      .eq('id', user.id)
      .single()

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['owner', 'school_admin'].includes(String(callerProfile.role))) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem fazer convites em massa' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (callerProfile.school_id !== school_id) {
      return new Response(JSON.stringify({ error: 'Operação bloqueada: O ID da escola diverge da escola do usuário' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validação da Turma
    if (class_id) {
      const { data: classData } = await supabaseAdmin
        .from('classes')
        .select('school_id')
        .eq('id', class_id)
        .single()

      if (!classData || classData.school_id !== school_id) {
        return new Response(JSON.stringify({ error: 'Operação bloqueada: Esta turma não pertence à sua escola' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Pegar nome, status e limite de alunos da escola
    const { data: schoolData } = await supabaseAdmin
      .from('schools')
      .select('name, student_count, subscription_status, is_trial_school')
      .eq('id', school_id)
      .single()

    if (!schoolData || !['active', 'trialing'].includes(String(schoolData.subscription_status || '').toLowerCase())) {
      return new Response(JSON.stringify({ error: 'A assinatura da escola precisa estar ativa ou em trial.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const studentsInBatch = users.filter((u) => u.role === 'student').length
    if (studentsInBatch > 0) {
      const { count: currentStudentCount } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school_id)
        .eq('role', 'student')

      const maxStudents = schoolData?.student_count ?? 0
      if (maxStudents > 0 && ((currentStudentCount || 0) >= maxStudents || (currentStudentCount || 0) + studentsInBatch > maxStudents)) {
        return new Response(
          JSON.stringify({
            error: 'Limite de alunos do plano atingido. Aumente o número de alunos na aba Assinatura.',
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    const school_name = schoolData?.name || 'Escola Parceira'
    const isTrialSchool = schoolData?.is_trial_school === true || schoolData?.subscription_status === 'trialing'
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br'
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { email: string, reason: string }[]
    }

    const CHUNK_SIZE = 10

    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      const chunk = users.slice(i, i + CHUNK_SIZE)

      await Promise.all(chunk.map(async (item) => {
        try {
          const email = (item.email || '').trim().toLowerCase()
          const name = (item.name || '').trim() || email.split('@')[0]
          const userRole: 'student' | 'teacher' = item.role === 'teacher' ? 'teacher' : 'student'
          const effectiveClassId = userRole === 'student' ? (class_id ?? null) : null

          if (!email) throw new Error('E-mail vazio')

          // Check existing profile to prevent cross-tenant hijack
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, school_id, status, role')
            .eq('email', email)
            .maybeSingle()

          if (existingProfile && existingProfile.school_id && existingProfile.school_id !== school_id && existingProfile.status !== 'invited') {
            throw new Error('Este e-mail já está vinculado a outra instituição.')
          }

          const userMetadata = {
            full_name: name,
            user_type: userRole,
            school_id: school_id,
            school_name: school_name,
            class_id: effectiveClassId,
            invited_by_school: school_name,
          }

          let userId: string
          let actionLink: string
          let targetStatus: 'invited' | 'active' = 'invited'

          // If pending invite in same school, clean up before recreating invite link
          if (existingProfile?.status === 'invited' && existingProfile.id) {
            await supabaseAdmin.auth.admin.deleteUser(existingProfile.id).catch(() => {})
            await supabaseAdmin.from('profiles').delete().eq('id', existingProfile.id)
          }

          // 1. Try generating invite link redirecting to /convite so user can define password
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
            targetStatus = 'invited'
          } else if (
            inviteError?.message?.includes('already been registered') ||
            inviteError?.message?.includes('already registered') ||
            inviteError?.code === 'email_exists'
          ) {
            if (!existingProfile?.id) {
              throw new Error('Este e-mail já possui conta registrada.')
            }
            userId = existingProfile.id
            targetStatus = existingProfile.status === 'active' ? 'active' : 'invited'

            const preservedRole = ['owner', 'school_admin'].includes(String(existingProfile.role))
              ? String(existingProfile.role)
              : userRole

            await supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: {
                ...userMetadata,
                user_type: preservedRole === 'owner' ? 'school_admin' : preservedRole,
              },
            })

            const { data: magicData, error: magicErr } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: email,
              options: {
                redirectTo: `${siteUrl}/login`,
                data: {
                  ...userMetadata,
                  user_type: preservedRole === 'owner' ? 'school_admin' : preservedRole,
                },
              },
            })
            if (magicErr) throw magicErr
            actionLink = magicData.properties.action_link
          } else {
            throw inviteError || new Error('Erro ao gerar convite')
          }

          // Ensure user_metadata is always populated on auth.users
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: userMetadata,
          }).catch(() => {})

          // 2. Upsert Profile (no non-existent school_teachers/class_students tables)
          const preservedDbRole = existingProfile && ['owner', 'school_admin'].includes(String(existingProfile.role))
            ? String(existingProfile.role)
            : userRole

          const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: userId,
            full_name: name,
            email: email,
            role: preservedDbRole,
            school_id: school_id,
            class_id: effectiveClassId,
            status: targetStatus,
            is_trial: isTrialSchool,
          }, { onConflict: 'id' })

          if (profileError) throw profileError

          // 3. Send Email via Brevo
          if (brevoApiKey) {
            const roleLabel = userRole === 'teacher' ? 'Professor(a)' : 'Estudante'
            const emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #111315; margin: 0; font-size: 24px;">Littera.</h1>
                </div>
                <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <h2 style="color: #111315; margin-top: 0;">Seja bem-vindo(a) à plataforma</h2>
                  <p style="color: #4b5563; line-height: 1.6;">Olá, <strong>${name}</strong>. Você foi convidado(a) para acessar o ambiente digital de excelência analítica e correção de redações da sua instituição.</p>
                  
                  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Instituição de Ensino</p>
                    <p style="margin: 5px 0 0 0; color: #111315; font-weight: bold; font-size: 16px;">${school_name}</p>
                    <p style="margin: 15px 0 0 0; color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Tipo de Acesso</p>
                    <p style="margin: 5px 0 0 0; color: #111315; font-weight: bold; font-size: 16px;">${roleLabel}</p>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${actionLink}" style="background-color: #111315; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">
                      Acessar Minha Conta
                    </a>
                  </div>
                  
                  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
                    Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
                    <span style="color: #6b7280; word-break: break-all;">${actionLink}</span>
                  </p>
                </div>
              </div>
            `

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
                subject: `Convite de acesso - ${school_name} | Littera`,
                htmlContent: emailHtml
              }),
            })
          }

          results.success++
        } catch (err: unknown) {
          results.failed++
          const errorMsg = err instanceof Error ? err.message : String(err)
          results.errors.push({ email: item.email, reason: errorMsg || 'Erro desconhecido' })
        }
      }))
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('Unexpected error in bulk-register:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
