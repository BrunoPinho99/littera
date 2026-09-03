import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://app.littera.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationPayload {
  toEmail?: string;
  email?: string;
  toName?: string;
  subject?: string;
  htmlContent?: string;
  html?: string;
  templateId?: number;
  params?: Record<string, unknown>;
  senderEmail?: string;
  senderName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authenticate the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const authKey = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // If it's not the service role key, we must verify the user
    if (authKey !== serviceRoleKey) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
      if (userError || !user) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.error('[send-notification] BREVO_API_KEY environment variable is missing.');
      return new Response(JSON.stringify({
        success: false,
        error: 'BREVO_API_KEY environment variable is not configured in Supabase secrets.',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload: NotificationPayload;
    try {
      payload = await req.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON body';
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetEmail = payload.toEmail || payload.email;
    const contentHtml = payload.htmlContent || payload.html;
    const { toName, subject, templateId, params, senderEmail, senderName } = payload;

    if (!targetEmail) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required field: toEmail or email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!templateId && !contentHtml) {
      return new Response(JSON.stringify({ success: false, error: 'Either htmlContent/html or templateId must be provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!templateId && !subject) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required field: subject when templateId is not provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const defaultSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'contato@littera.com.br';
    const defaultSenderName = Deno.env.get('BREVO_SENDER_NAME') || 'Littera - Inteligência em Redação';

    const brevoBody: Record<string, unknown> = {
      sender: {
        email: senderEmail || defaultSenderEmail,
        name: senderName || defaultSenderName,
      },
      to: [{
        email: targetEmail,
        name: toName || targetEmail.split('@')[0],
      }],
    };

    if (subject) {
      brevoBody.subject = subject;
    }

    if (templateId) {
      brevoBody.templateId = Number(templateId);
      if (params) {
        brevoBody.params = params;
      }
    } else if (contentHtml) {
      brevoBody.htmlContent = contentHtml;
    }

    console.log(`[send-notification] Dispatching email to ${targetEmail} via Brevo API...`);

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
    let resJson: { message?: string; messageId?: string; [key: string]: unknown };
    try {
      resJson = JSON.parse(resText);
    } catch {
      resJson = { message: resText };
    }

    if (!brevoRes.ok) {
      console.error('[send-notification] Brevo API Error:', brevoRes.status, resJson);
      return new Response(JSON.stringify({
        success: false,
        status: brevoRes.status,
        error: resJson.message || `Brevo API Error (${brevoRes.status})`,
        details: resJson,
      }), {
        status: brevoRes.status >= 400 && brevoRes.status < 600 ? brevoRes.status : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[send-notification] Email successfully dispatched:', resJson);

    return new Response(JSON.stringify({
      success: true,
      messageId: resJson.messageId,
      data: resJson,
      message: `Notification sent successfully to ${targetEmail}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    console.error('[send-notification] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
