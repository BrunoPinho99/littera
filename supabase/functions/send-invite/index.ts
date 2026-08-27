import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://app.littera.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InvitePayload {
  action?: 'send' | 'revoke';
  email: string;
  name?: string;
  role?: 'student' | 'professor';
  school_id?: string;
  school_name?: string;
  class_id?: string;
  templateId?: number;
  params?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: InvitePayload = await req.json();
    const { action = 'send', email, name, role, school_id, school_name, class_id, templateId, params } = payload;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    if (action === 'revoke') {
      if (!email) {
        return new Response(JSON.stringify({ error: 'Missing required field: email for revoke action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
      if (profile?.id) {
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
      }
      await supabaseAdmin.from('profiles').delete().eq('email', email);

      return new Response(JSON.stringify({ success: true, message: `Convite revogado para ${email}.` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email || !name || !role || !school_id || !school_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, name, role, school_id, school_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate action link via Supabase Admin API without sending default SMTP email
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br'}/convite`,
        data: {
          full_name: name,
          user_type: role === 'professor' ? 'teacher' : 'student',
          school_id: school_id,
          school_name: school_name,
          class_id: class_id ?? null,
          invited_by_school: school_name,
        },
      },
    });

    let actionLink = `${Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br'}/login`;
    let userId: string | undefined;
    let alreadyExists = false;

    if (error) {
      if (error.message?.includes('already been registered') || error.code === 'email_exists' || error.message?.includes('User already registered')) {
        alreadyExists = true;
        const { data: existingUser } = await supabaseAdmin.from('profiles').select('id, status').eq('email', email).maybeSingle();
        
        if (existingUser?.status === 'invited' && existingUser.id) {
          // Usuário possui apenas convite pendente e não ativou a conta. Deleta do auth.users e recria um novo convite limpo.
          try {
            await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
            const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'invite',
              email: email,
              options: {
                redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br'}/convite`,
                data: {
                  full_name: name,
                  user_type: role === 'professor' ? 'teacher' : 'student',
                  school_id: school_id,
                  school_name: school_name,
                  class_id: class_id ?? null,
                  invited_by_school: school_name,
                },
              },
            });
            if (!retryError && retryData?.user?.id) {
              userId = retryData.user.id;
              if (retryData.properties?.action_link) {
                actionLink = retryData.properties.action_link;
              }
              alreadyExists = false;
              await supabaseAdmin.from('profiles').delete().eq('email', email);
              await supabaseAdmin.from('profiles').upsert({
                id: userId,
                full_name: name,
                email: email,
                role: role === 'professor' ? 'teacher' : 'student',
                school_id: school_id,
                class_id: class_id ?? null,
                status: 'invited'
              }, { onConflict: 'id' });
            }
          } catch (delErr) {
            console.error("Erro ao recriar convite pendente:", delErr);
          }
        }

        if (alreadyExists) {
          if (existingUser?.id) {
            userId = existingUser.id;
            await supabaseAdmin.from('profiles').update({
              school_id: school_id,
              class_id: class_id ?? null,
              role: role === 'professor' ? 'teacher' : 'student'
            }).eq('id', existingUser.id);
          }

          try {
            const { data: magicData } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: email,
              options: {
                redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br'}/login`,
              }
            });
            if (magicData?.properties?.action_link) {
              actionLink = magicData.properties.action_link;
            }
          } catch (_) {
            // fallback to login url
          }
        }
      } else {
        console.error('generateLink error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      userId = data?.user?.id;
      if (data?.properties?.action_link) {
        actionLink = data.properties.action_link;
      }
      
      if (userId) {
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
          id: userId,
          full_name: name,
          email: email,
          role: role === 'professor' ? 'teacher' : 'student',
          school_id: school_id,
          class_id: class_id ?? null,
          status: 'invited'
        }, { onConflict: 'id' });
        
        if (profileError) {
          console.error('Error creating provisional profile:', profileError);
        }
      }
    }

    // Direct call to Brevo API (https://api.brevo.com/v3/smtp/email)
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    let emailSent = false;
    let emailError: string | null = null;
    let brevoMessageId: string | null = null;

    if (!brevoApiKey) {
      console.warn('[send-invite] BREVO_API_KEY is not configured in environment variables.');
      emailError = 'BREVO_API_KEY environment variable is not set.';
    } else {
      const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'contato@littera.com.br';
      const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Littera - Inteligência em Redação';
      const roleLabel = role === 'professor' ? 'Professor(a)' : 'Estudante';
      const subject = alreadyExists 
        ? `Acesso vinculado à instituição ${school_name} | Littera`
        : `Convite de acesso - ${school_name} | Littera`;

      const brevoBody: Record<string, any> = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: email, name: name }],
        subject: subject,
      };

      const resolvedTemplateId = templateId || (Deno.env.get('BREVO_INVITE_TEMPLATE_ID') ? Number(Deno.env.get('BREVO_INVITE_TEMPLATE_ID')) : null);

      if (resolvedTemplateId) {
        brevoBody.templateId = resolvedTemplateId;
        brevoBody.params = {
          name,
          role: roleLabel,
          school_name,
          email,
          action_link: actionLink,
          already_exists: alreadyExists,
          ...(params || {})
        };
      } else {
        const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #F4F5F8;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1A1D1F;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F4F5F8;
      padding: 56px 20px;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 24px;
      padding: 48px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.03);
    }
    .logo {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.04em;
      color: #111315;
      margin-bottom: 40px;
    }
    .heading {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #111315;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    .paragraph {
      font-size: 15px;
      line-height: 1.65;
      color: #535862;
      margin-bottom: 24px;
    }
    .card-tonal {
      background-color: #F8FAFC;
      border-radius: 16px;
      padding: 24px 28px;
      margin: 32px 0;
    }
    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      color: #717680;
      margin-bottom: 6px;
    }
    .value {
      font-size: 15px;
      font-weight: 600;
      color: #1A1D1F;
      margin-bottom: 18px;
    }
    .value:last-child {
      margin-bottom: 0;
    }
    .btn-wrap {
      margin: 36px 0 32px 0;
    }
    .button {
      display: inline-block;
      background-color: #111315;
      color: #FFFFFF !important;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      transition: background-color 0.2s ease;
    }
    .footer {
      font-size: 12px;
      line-height: 1.6;
      color: #949A9E;
      margin-top: 40px;
    }
    .footer-link {
      color: #717680;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo">Littera.</div>
      <div class="heading">Seja bem-vindo(a) à plataforma</div>
      <div class="paragraph">
        Olá, <strong>${name}</strong>. Você foi convidado(a) para acessar o ambiente digital de excelência analítica e correção de redações da sua instituição.
      </div>
      
      <div class="card-tonal">
        <div class="label">Instituição de Ensino</div>
        <div class="value">${school_name}</div>
        <div class="label">Perfil de Acesso</div>
        <div class="value">${roleLabel}</div>
        <div class="label">E-mail de Acesso</div>
        <div class="value">${email}</div>
      </div>

      <div class="paragraph">
        Para confirmar seu convite, validar suas credenciais da escola e entrar na plataforma, clique no botão abaixo:
      </div>

      <div class="btn-wrap">
        <a href="${actionLink}" class="button">Acessar Plataforma</a>
      </div>

      <div class="footer">
        Se o botão não responder, copie e cole o endereço no seu navegador:<br>
        <a href="${actionLink}" class="footer-link">${actionLink}</a>
      </div>
    </div>
  </div>
</body>
</html>`;
        brevoBody.htmlContent = htmlContent;
      }

      try {
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': brevoApiKey,
          },
          body: JSON.stringify(brevoBody),
        });

        const resText = await brevoRes.text();
        let resJson: any;
        try { resJson = JSON.parse(resText); } catch { resJson = { message: resText }; }

        if (!brevoRes.ok) {
          console.error('[send-invite] Brevo API Error:', brevoRes.status, resJson);
          emailError = `Brevo API Error (${brevoRes.status}): ${resJson.message || resText}`;
        } else {
          console.log('[send-invite] Brevo email sent successfully:', resJson);
          emailSent = true;
          brevoMessageId = resJson.messageId;
        }
      } catch (err: any) {
        console.error('[send-invite] Error executing Brevo fetch:', err);
        emailError = err.message || String(err);
      }
    }

    console.log(`Invite processed for ${email} (${name}) - emailSent: ${emailSent}`);

    if (alreadyExists) {
      return new Response(JSON.stringify({
        success: false,
        alreadyExists: true,
        userId: userId,
        emailSent: emailSent,
        messageId: brevoMessageId,
        emailError: emailError,
        message: 'Este email já possui uma conta ativa na plataforma. Vínculo atualizado e notificação enviada.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      userId: userId,
      emailSent: emailSent,
      messageId: brevoMessageId,
      emailError: emailError,
      message: emailSent ? `Convite enviado pelo Brevo para ${email}` : `Convite gerado, mas falhou ao enviar e-mail: ${emailError || 'Verifique BREVO_API_KEY'}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    console.error('Unexpected error in send-invite:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
