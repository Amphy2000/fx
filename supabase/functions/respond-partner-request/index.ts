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

    const { partnership_id, action } = await req.json();

    if (!partnership_id || !action) {
      throw new Error('Partnership ID and action are required');
    }

    if (!['accept', 'reject'].includes(action)) {
      throw new Error('Action must be either accept or reject');
    }

    console.log('Responding to partnership request:', partnership_id, 'action:', action);

    // Verify user is the partner (receiver)
    const { data: partnership, error: fetchError } = await supabaseClient
      .from('accountability_partnerships')
      .select('*')
      .eq('id', partnership_id)
      .eq('partner_id', user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !partnership) {
      throw new Error('Partnership request not found or unauthorized');
    }

    if (action === 'accept') {
      // Check user's max partners limit
      const { data: userProfile } = await supabaseClient
        .from('accountability_profiles')
        .select('max_partners')
        .eq('user_id', user.id)
        .single();

      const { count: userPartnerCount } = await supabaseClient
        .from('accountability_partnerships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active');

      if (userPartnerCount && userProfile && userPartnerCount >= userProfile.max_partners) {
        throw new Error('You have reached maximum number of partnerships');
      }

      // Accept partnership
      const { data: updated, error: updateError } = await supabaseClient
        .from('accountability_partnerships')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString()
        })
        .eq('id', partnership_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error accepting partnership:', updateError);
        throw updateError;
      }

      console.log('Partnership accepted:', partnership_id);

      return new Response(
        JSON.stringify({ partnership: updated, message: 'Partnership accepted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Reject partnership
      const { error: updateError } = await supabaseClient
        .from('accountability_partnerships')
        .update({ status: 'rejected' })
        .eq('id', partnership_id);

      if (updateError) {
        console.error('Error rejecting partnership:', updateError);
        throw updateError;
      }

      console.log('Partnership rejected:', partnership_id);

      return new Response(
        JSON.stringify({ message: 'Partnership rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in respond-partner-request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
