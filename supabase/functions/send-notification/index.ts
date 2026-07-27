const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationPayload {
  toEmail: string;
  toName?: string;
  subject?: string;
  htmlContent?: string;
  templateId?: number;
  params?: Record<string, any>;
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

    const { toEmail, toName, subject, htmlContent, templateId, params, senderEmail, senderName } = payload;

    if (!toEmail) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required field: toEmail' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!templateId && !htmlContent) {
      return new Response(JSON.stringify({ success: false, error: 'Either htmlContent or templateId must be provided' }), {
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

    const defaultSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'bruno.pinho.brasilia@hotmail.com';
    const defaultSenderName = Deno.env.get('BREVO_SENDER_NAME') || 'Littera - Inteligência em Redação';

    const brevoBody: Record<string, any> = {
      sender: {
        email: senderEmail || defaultSenderEmail,
        name: senderName || defaultSenderName,
      },
      to: [{
        email: toEmail,
        name: toName || toEmail.split('@')[0],
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
    } else if (htmlContent) {
      brevoBody.htmlContent = htmlContent;
    }

    console.log(`[send-notification] Dispatching email to ${toEmail} via Brevo API...`);

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
      message: `Notification sent successfully to ${toEmail}`,
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
