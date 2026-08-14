import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface StartTrialPayload {
  name: string
  email: string
  whatsapp: string
  school_name: string
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

    const payload: StartTrialPayload = await req.json()
    const { name, email, whatsapp, school_name } = payload

    if (!email || !whatsapp || !name || !school_name) {
      return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validações básicas (formatos)
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
      return new Response(JSON.stringify({ error: 'WhatsApp inválido. Deve ter DDD + 9 dígitos (ex: 11999999999)' }), {
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

    // 1. Check if email or whatsapp already used a trial
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

    // 2. Generate Magic Link (this also creates the Auth user if it doesn't exist)
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

    // 3. Update / Insert Profile
    const trialSchoolId = '00000000-0000-0000-0000-000000000000'
    const now = new Date()
    const trialEndsAt = new Date(now)
    trialEndsAt.setDate(trialEndsAt.getDate() + 15)

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: name,
      email: email,
      role: 'student',
      school_id: trialSchoolId,
      status: 'active',
      is_trial: true,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      trial_school_name: school_name,
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    // 4. Insert into trial_history
    await supabaseAdmin.from('trial_history').insert({
      email: email,
      whatsapp: cleanWhatsapp,
      auth_user_id: userId,
      school_name: school_name,
    })

    // 5. Check Threshold for Warm School Alert
    const threshold = parseInt(Deno.env.get('TRIAL_SCHOOL_ALERT_THRESHOLD') ?? '3', 10)
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .ilike('trial_school_name', school_name)
      .eq('school_id', trialSchoolId)

    const adminEmail = 'bruno.pinho.brasilia@hotmail.com'
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')

    if (!countError && count && count >= threshold) {
      // Check if alert was already sent
      const { data: existingAlert } = await supabaseAdmin
        .from('trial_alerts_sent')
        .select('id')
        .ilike('school_name', school_name)
        .maybeSingle()

      if (!existingAlert && brevoApiKey) {
        // Log alert sent to avoid concurrent triggers sending multiple
        await supabaseAdmin.from('trial_alerts_sent').insert({
          school_name: school_name
        })

        // Send Email to Admin via Brevo
        const alertHtml = `
          <h2>Escola em Aquecimento! 🔥</h2>
          <p>A escola <strong>${school_name}</strong> atingiu ${count} alunos ativos no Trial.</p>
          <p>Acesse o painel do Littera para ver mais detalhes e entrar em contato com os alunos.</p>
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
              sender: { name: 'Littera Alertas', email: 'no-reply@littera.com.br' },
              to: [{ email: adminEmail, name: 'Bruno Pinho' }],
              subject: `🔥 ${school_name} atingiu ${count} alunos no Trial!`,
              htmlContent: alertHtml
            }),
          })
          console.log(`Alert sent for school: ${school_name}`)
        } catch (alertErr) {
          console.error('Error sending alert email:', alertErr)
        }
      }
    }

    // 6. Send Magic Link to Student via Brevo
    if (brevoApiKey) {
      const studentHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Bem-vindo ao Trial do Littera! 🚀</h2>
          <p>Olá ${name},</p>
          <p>Seu período de teste gratuito de 15 dias acaba de começar!</p>
          <p>Você tem direito a enviar 2 redações por dia civil e receber correções ultra-detalhadas instantaneamente.</p>
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
            subject: 'Seu Teste Gratuito de 15 Dias Começou! | Littera',
            htmlContent: studentHtml
          }),
        })
      } catch (studentErr) {
        console.error('Error sending welcome email to student:', studentErr)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Trial iniciado com sucesso! Enviamos um link de acesso para o seu e-mail.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('Unexpected error in start-trial:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
