import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Não autorizado. Token de autenticação ausente.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'Configuração do servidor ausente.' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callerUser) {
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('school_id, role')
      .eq('id', callerUser.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return jsonResponse({ error: 'Perfil do solicitante não encontrado.' }, 403);
    }

    const allowedCallerRoles = ['owner', 'school_admin', 'teacher', 'professor'];
    if (!allowedCallerRoles.includes(String(callerProfile.role))) {
      return jsonResponse({ error: 'Permissão negada: apenas gestores e professores podem gerenciar convites.' }, 403);
    }

    const payload: InvitePayload = await req.json();
    const { action = 'send', name, role, school_id, school_name, class_id, templateId, params } = payload;
    const normalizedEmail = (payload.email || '').trim().toLowerCase();

    if (action === 'revoke') {
      if (!normalizedEmail) {
        return jsonResponse({ error: 'Missing required field: email for revoke action' }, 400);
      }

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, school_id, status')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!targetProfile) {
        return jsonResponse({ error: 'Convite não encontrado para este e-mail.' }, 404);
      }

      if (!callerProfile.school_id || targetProfile.school_id !== callerProfile.school_id) {
        return jsonResponse({ error: 'Operação negada: o usuário não pertence à sua instituição.' }, 403);
      }

      if (targetProfile.status !== 'invited') {
        return jsonResponse({ error: 'Não é possível revogar: esta conta já foi ativada pelo usuário.' }, 403);
      }

      await supabaseAdmin.auth.admin.deleteUser(targetProfile.id);
      await supabaseAdmin.from('profiles').delete().eq('id', targetProfile.id);

      return jsonResponse({ success: true, message: `Convite revogado para ${normalizedEmail}.` }, 200);
    }

    if (!normalizedEmail || !name || !role || !school_id || !school_name) {
      return jsonResponse({ error: 'Missing required fields: email, name, role, school_id, school_name' }, 400);
    }

    if (!callerProfile.school_id || callerProfile.school_id !== school_id) {
      return jsonResponse({ error: 'Operação bloqueada: school_id diverge da instituição do usuário.' }, 403);
    }

    if (role === 'professor' && !['owner', 'school_admin'].includes(String(callerProfile.role))) {
      return jsonResponse({ error: 'Apenas administradores da escola podem convidar professores.' }, 403);
    }

    // Verify school status and seat limits
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, name, subscription_status, student_count, is_trial_school')
      .eq('id', school_id)
      .single();

    if (schoolError || !schoolData) {
      return jsonResponse({ error: 'Instituição não encontrada.' }, 404);
    }

    if (!['active', 'trialing'].includes(String(schoolData.subscription_status || '').toLowerCase())) {
      return jsonResponse({ error: 'A assinatura da escola precisa estar ativa ou em trial para enviar convites.' }, 403);
    }

    // Validate class belongs to school if provided
    if (class_id) {
      const { data: classData } = await supabaseAdmin
        .from('classes')
        .select('id, school_id')
        .eq('id', class_id)
        .maybeSingle();

      if (!classData || classData.school_id !== school_id) {
        return jsonResponse({ error: 'Turma inválida ou não pertence à sua escola.' }, 403);
      }
    }

    const dbRole = role === 'professor' ? 'teacher' : 'student';
    const userMetadata = {
      full_name: name.trim(),
      user_type: dbRole,
      school_id: school_id,
      school_name: school_name,
      class_id: class_id ?? null,
      invited_by_school: school_name,
    };

    // Enforce seat limit on student invites
    const { data: existingProfileCheck } = await supabaseAdmin
      .from('profiles')
      .select('id, status, school_id, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfileCheck && existingProfileCheck.school_id && existingProfileCheck.school_id !== school_id && existingProfileCheck.status !== 'invited') {
      return jsonResponse({ error: 'Este e-mail já está vinculado a outra instituição.' }, 409);
    }

    if (dbRole === 'student' && !existingProfileCheck && (schoolData.student_count ?? 0) > 0) {
      const { count: currentStudentCount } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school_id)
        .eq('role', 'student');

      if ((currentStudentCount || 0) >= schoolData.student_count) {
        return jsonResponse({ error: 'Limite de alunos do plano atingido. Aumente o número de alunos na aba Assinatura.' }, 403);
      }
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br';
    const isTrialSchool = schoolData.is_trial_school === true || schoolData.subscription_status === 'trialing';

    // Generate action link via Supabase Admin API without sending default SMTP email
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/convite`,
        data: userMetadata,
      },
    });

    let actionLink = `${siteUrl}/login`;
    let userId: string | undefined;
    let alreadyExists = false;

    if (error) {
      if (error.message?.includes('already been registered') || error.code === 'email_exists' || error.message?.includes('User already registered')) {
        alreadyExists = true;
        const existingUser = existingProfileCheck;

        if (existingUser?.status === 'invited' && existingUser.id && (!existingUser.school_id || existingUser.school_id === school_id)) {
          // Usuário possui apenas convite pendente nesta escola. Deleta do auth.users e recria um novo convite limpo.
          try {
            await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
            const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'invite',
              email: normalizedEmail,
              options: {
                redirectTo: `${siteUrl}/convite`,
                data: userMetadata,
              },
            });
            if (!retryError && retryData?.user?.id) {
              userId = retryData.user.id;
              if (retryData.properties?.action_link) {
                actionLink = retryData.properties.action_link;
              }
              alreadyExists = false;
              await supabaseAdmin.from('profiles').delete().eq('id', existingUser.id);
              await supabaseAdmin.from('profiles').upsert({
                id: userId,
                full_name: name.trim(),
                email: normalizedEmail,
                role: dbRole,
                school_id: school_id,
                class_id: class_id ?? null,
                status: 'invited',
                is_trial: isTrialSchool,
              }, { onConflict: 'id' });
            }
          } catch (delErr) {
            console.error('Erro ao recriar convite pendente:', delErr);
          }
        }

        if (alreadyExists) {
          if (existingUser?.school_id && existingUser.school_id !== school_id) {
            return jsonResponse({ error: 'Este e-mail já está vinculado a outra instituição.' }, 409);
          }

          if (existingUser?.id) {
            userId = existingUser.id;
            const preservedRole = ['owner', 'school_admin'].includes(String(existingUser.role))
              ? String(existingUser.role)
              : dbRole;

            await supabaseAdmin.from('profiles').update({
              school_id: school_id,
              class_id: class_id ?? null,
              role: preservedRole,
            }).eq('id', existingUser.id);

            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              user_metadata: {
                ...userMetadata,
                user_type: preservedRole === 'owner' ? 'school_admin' : preservedRole,
              },
            });
          }

          try {
            const { data: magicData } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: normalizedEmail,
              options: {
                redirectTo: `${siteUrl}/login`,
              },
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
        return jsonResponse({ error: error.message }, 400);
      }
    } else {
      userId = data?.user?.id;
      if (data?.properties?.action_link) {
        actionLink = data.properties.action_link;
      }

      if (userId) {
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
          id: userId,
          full_name: name.trim(),
          email: normalizedEmail,
          role: dbRole,
          school_id: school_id,
          class_id: class_id ?? null,
          status: 'invited',
          is_trial: isTrialSchool,
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
      const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Littera';
      const roleLabel = role === 'professor' ? 'Professor(a)' : 'Estudante';
      const subject = alreadyExists
        ? `Acesso vinculado à instituição ${school_name} | Littera`
        : `Convite de acesso - ${school_name} | Littera`;

      const brevoBody: Record<string, any> = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: normalizedEmail, name: name }],
        subject: subject,
      };

      const resolvedTemplateId = templateId || (Deno.env.get('BREVO_INVITE_TEMPLATE_ID') ? Number(Deno.env.get('BREVO_INVITE_TEMPLATE_ID')) : null);

      if (resolvedTemplateId) {
        brevoBody.templateId = resolvedTemplateId;
        brevoBody.params = {
          name,
          role: roleLabel,
          school_name,
          email: normalizedEmail,
          action_link: actionLink,
          already_exists: alreadyExists,
          ...(params || {}),
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
        <div class="value">${normalizedEmail}</div>
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

    console.log(`Invite processed for ${normalizedEmail} (${name}) - emailSent: ${emailSent}`);

    if (alreadyExists) {
      return jsonResponse({
        success: false,
        alreadyExists: true,
        userId: userId,
        emailSent: emailSent,
        messageId: brevoMessageId,
        emailError: emailError,
        message: 'Este email já possui uma conta ativa na plataforma. Vínculo atualizado e notificação enviada.',
      }, 200);
    }

    return jsonResponse({
      success: true,
      userId: userId,
      emailSent: emailSent,
      messageId: brevoMessageId,
      emailError: emailError,
      message: emailSent ? `Convite enviado pelo Brevo para ${normalizedEmail}` : `Convite gerado, mas falhou ao enviar e-mail: ${emailError || 'Verifique BREVO_API_KEY'}`,
    }, 200);

  } catch (err: unknown) {
    console.error('Unexpected error in send-invite:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
