import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { partner_id, message } = await req.json();

    if (!partner_id) {
      throw new Error('Partner ID is required');
    }

    console.log('Sending partner request from', user.id, 'to', partner_id);

    // Check if partnership already exists
    const { data: existing } = await supabaseClient
      .from('accountability_partnerships')
      .select('id, status')
      .or(`and(user_id.eq.${user.id},partner_id.eq.${partner_id}),and(user_id.eq.${partner_id},partner_id.eq.${user.id})`)
      .single();

    if (existing) {
      throw new Error(`Partnership already exists with status: ${existing.status}`);
    }

    // Check partner's max partners limit
    const { data: partnerProfile } = await supabaseClient
      .from('accountability_profiles')
      .select('max_partners')
      .eq('user_id', partner_id)
      .single();

    const { count: partnerCount } = await supabaseClient
      .from('accountability_partnerships')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${partner_id},partner_id.eq.${partner_id}`)
      .eq('status', 'active');

    if (partnerCount && partnerProfile && partnerCount >= partnerProfile.max_partners) {
      throw new Error('Partner has reached maximum number of partnerships');
    }

    // Create partnership request
    const { data: partnership, error: insertError } = await supabaseClient
      .from('accountability_partnerships')
      .insert({
        user_id: user.id,
        partner_id,
        initiated_by: user.id,
        status: 'pending',
        request_message: message,
        shared_data_permissions: {
          share_trades: true,
          share_metrics: true,
          share_journal: false,
          share_checkins: false
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating partnership:', insertError);
      throw insertError;
    }

    console.log('Partnership request created:', partnership.id);

    return new Response(
      JSON.stringify({ partnership }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-partner-request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
