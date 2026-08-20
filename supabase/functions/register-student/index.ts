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
    const { action = 'register', name, email, whatsapp, invite_code } = payload

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
      .select('id, name, school_id, max_students, schools(name, is_trial_school)')
      .eq('invite_code', invite_code)
      .maybeSingle()

    if (classError || !classData) {
      return new Response(JSON.stringify({ error: 'Turma não encontrada ou código inválido' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { id: class_id, name: class_name, school_id, max_students, schools } = classData
    const school_name = schools?.name || 'Escola'
    const is_trial = schools?.is_trial_school === true

    // 2. Check if class is full
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', class_id)
      .eq('role', 'student')

    const isFull = !countError && count !== null && count >= max_students

    if (action === 'check') {
       return new Response(JSON.stringify({
         success: true,
         class_name,
         school_name,
         is_full: is_trial ? isFull : false,
       }), {
         status: 200,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       })
    }

    // --- Action: register ---
    if (is_trial && isFull) {
      return new Response(JSON.stringify({ error: 'Turma já atingiu o limite de vagas' }), {
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

    // 4. Generate Magic Link
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br'
    const { data: magicLinkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${siteUrl}/login`,
        data: {
          full_name: name,
        }
      },
    })

    if (linkError) {
      console.error('Error generating magic link:', linkError)
      return new Response(JSON.stringify({ error: 'Erro ao gerar acesso' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = magicLinkData.user.id
    const actionLink = magicLinkData.properties.action_link

    // 5. Update / Insert Profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: name,
      email: email,
      role: 'student',
      school_id: school_id,
      class_id: class_id,
      status: 'active',
      is_trial: is_trial,
      ...(is_trial ? {
        trial_started_at: new Date().toISOString(),
        trial_school_name: school_name,
        originated_from_trial: true,
      } : {})
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Even if profile fails, user is created, but it's an edge case.
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

    // 7. Send Magic Link to Student via Brevo
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
              Acessar Plataforma Agora
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
            sender: { name: 'Littera - Inteligência em Redação', email: Deno.env.get('BREVO_SENDER_EMAIL') || 'bruno.pinho.brasilia@hotmail.com' },
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
      message: 'Cadastro realizado com sucesso! Verifique seu e-mail para acessar a plataforma.',
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
