// @ts-nocheck: legacy types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ConvertSchoolPayload {
  school_id: string
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

    // Authenticate the request comes from an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user || user.email !== 'bruno.pinho.brasilia@hotmail.com') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: corsHeaders })
    }

    const payload: ConvertSchoolPayload = await req.json()
    const { school_id } = payload

    if (!school_id) {
      return new Response(JSON.stringify({ error: 'school_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to bypass RLS for updates
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

    // 1. Update school
    const { error: schoolError } = await supabaseAdmin
      .from('schools')
      .update({ is_trial_school: false, subscription_status: 'active' })
      .eq('id', school_id)

    if (schoolError) {
      throw new Error(`Failed to update school: ${schoolError.message}`)
    }

    // 2. Update profiles in the school
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .update({ is_trial: false })
      .eq('school_id', school_id)

    if (profilesError) {
      throw new Error(`Failed to update profiles: ${profilesError.message}`)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Escola e alunos convertidos para pagantes com sucesso!',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('Unexpected error in convert-trial-school:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
