import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // Verify caller is an authenticated admin
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
  if (userError || !user) return json({ error: 'Unauthorized' }, 401)

  const { data: caller } = await supabaseClient
    .from('volunteers')
    .select('is_admin')
    .eq('auth_id', user.id)
    .single()

  if (!caller?.is_admin) return json({ error: 'Forbidden' }, 403)

  const { email, volunteerId } = await req.json()
  if (!email || !volunteerId) return json({ error: 'email en volunteerId zijn verplicht' }, 400)

  // Use service role key to send invite and link auth_id
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: invite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
  if (inviteError) return json({ error: inviteError.message }, 400)

  const { error: updateError } = await supabaseAdmin
    .from('volunteers')
    .update({ auth_id: invite.user.id })
    .eq('id', volunteerId)

  if (updateError) return json({ error: updateError.message }, 500)

  return json({ success: true })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
