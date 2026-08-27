import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://app.littera.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SubmitLeadPayload {
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

    const payload: SubmitLeadPayload = await req.json()
    const { name, email, whatsapp, school_name } = payload

    if (!email || !whatsapp || !name || !school_name) {
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

    // 1. Insert lead into leads table
    const { error: insertError } = await supabaseAdmin.from('leads').insert({
      name,
      email,
      whatsapp: cleanWhatsapp,
      school_name,
    })

    if (insertError) {
      console.error('Error inserting lead:', insertError)
      return new Response(JSON.stringify({ error: 'Erro ao salvar o lead. Tente novamente mais tarde.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Send Email to Admin via Brevo
    const adminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL') || 'contato@littera.com.br'
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')

    if (brevoApiKey) {
      const alertHtml = `
        <h2>Novo Lead Capturado! 🚀</h2>
        <p>Um diretor/coordenador acabou de preencher o formulário na Landing Page.</p>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>WhatsApp:</strong> ${cleanWhatsapp}</p>
        <p><strong>Escola:</strong> ${school_name}</p>
        <p>Acesse o painel para agendar a reunião de ativação do Trial.</p>
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
            sender: { name: 'Littera Leads', email: 'no-reply@littera.com.br' },
            to: [{ email: adminEmail, name: 'Bruno Pinho' }],
            subject: `🚀 Novo Lead: ${school_name} (${name})`,
            htmlContent: alertHtml
          }),
        })
      } catch (alertErr) {
        console.error('Error sending lead alert email:', alertErr)
        // Não falharemos o request para o usuário se o alerta falhar, apenas logamos.
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Recebemos seu contato com sucesso! Entraremos em contato em breve para agendar uma demonstração.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('Unexpected error in submit-lead:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
