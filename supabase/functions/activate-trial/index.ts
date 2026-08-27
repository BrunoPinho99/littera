import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://app.littera.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ActivateTrialPayload {
  school_name: string
  class_name: string
  max_students: number
  start_date: string // ISO string
  lead_id?: string
}

function generateTrialCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
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
    if (userError || !user || user.user_metadata?.role !== 'littera_admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: corsHeaders })
    }

    const payload: ActivateTrialPayload = await req.json()
    const { school_name, class_name, max_students, start_date, lead_id } = payload

    if (!school_name || !class_name || !max_students || !start_date) {
      return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to bypass RLS for inserts
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

    // 1. Find or create the school
    let finalSchoolId = ''
    
    // Attempt to find by name first
    const { data: existingSchool } = await supabaseAdmin
      .from('schools')
      .select('id')
      .ilike('name', school_name)
      .maybeSingle()

    if (existingSchool) {
      finalSchoolId = existingSchool.id
      // ensure it's marked as trial
      await supabaseAdmin.from('schools').update({ is_trial_school: true }).eq('id', finalSchoolId)
    } else {
      const { data: newSchool, error: newSchoolError } = await supabaseAdmin
        .from('schools')
        .insert({
          name: school_name,
          email: 'trial@littera.app.br',
          is_trial_school: true,
          subscription_status: 'trialing'
        })
        .select('id')
        .single()
        
      if (newSchoolError) {
        throw new Error(`Erro ao criar escola: ${newSchoolError.message}`)
      }
      finalSchoolId = newSchool.id
    }

    // 2. Generate unique code
    let invite_code = generateTrialCode()
    let isUnique = false

    while (!isUnique) {
      const { data: codeCheck } = await supabaseAdmin.from('classes').select('id').eq('invite_code', invite_code).maybeSingle()
      
      if (!codeCheck) {
        isUnique = true
      } else {
        invite_code = generateTrialCode()
      }
    }

    // 3. Create class
    const startDateObj = new Date(start_date)
    const endsDateObj = new Date(startDateObj)
    endsDateObj.setDate(endsDateObj.getDate() + 15) // + 15 days

    const { data: newClass, error: newClassError } = await supabaseAdmin
      .from('classes')
      .insert({
        name: class_name,
        school_id: finalSchoolId,
        grade: 'Trial',
        shift: 'Matutino',
        invite_code: invite_code,
        max_students: max_students,
        trial_ends_at: endsDateObj.toISOString(),
      })
      .select('id')
      .single()

    if (newClassError) {
      throw new Error(`Erro ao criar turma: ${newClassError.message}`)
    }

    // 4. Update lead status if provided
    if (lead_id) {
      await supabaseAdmin.from('leads').update({ status: 'activated' }).eq('id', lead_id)
    }

    return new Response(JSON.stringify({
      success: true,
      invite_code: invite_code,
      message: 'Trial ativado com sucesso!',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('Unexpected error in activate-trial:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
