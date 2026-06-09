import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InvitePayload {
  email: string;
  name: string;
  role: 'student' | 'professor';
  school_id: string;
  school_name: string;
  class_id?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body
    const payload: InvitePayload = await req.json();
    const { email, name, role, school_id, school_name, class_id } = payload;

    if (!email || !name || !role || !school_id || !school_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, name, role, school_id, school_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client with service_role key (only safe here in backend)
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

    // Invite user via Supabase Admin API
    // This sends an email with a magic link that redirects to /convite
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://app.littera.com.br'}/convite`,
      data: {
        full_name: name,
        user_type: role === 'professor' ? 'teacher' : 'student',
        school_id: school_id,
        school_name: school_name,
        class_id: class_id ?? null,
        invited_by_school: school_name,
      },
    });

    if (error) {
      // If user already exists in auth, it's not necessarily a fatal error
      // (they might already have an account)
      if (error.message?.includes('already been registered') || error.code === 'email_exists') {
        return new Response(JSON.stringify({
          success: false,
          alreadyExists: true,
          message: 'Este email já possui uma conta ativa na plataforma.',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.error('inviteUserByEmail error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Invite sent to ${email} (${name}) for school ${school_name}`);

    return new Response(JSON.stringify({
      success: true,
      userId: data.user?.id,
      message: `Convite enviado para ${email}`,
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
