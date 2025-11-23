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

    const url = new URL(req.url);
    const partnership_id = url.searchParams.get('partnership_id');

    console.log('Fetching goals for partnership:', partnership_id);

    let query = supabaseClient
      .from('partner_goals')
      .select(`
        *,
        user:profiles!partner_goals_user_id_fkey(full_name, email),
        check_ins:goal_check_ins(
          *,
          reactions:partner_reactions(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (partnership_id) {
      // Verify user is part of this partnership
      const { data: partnership } = await supabaseClient
        .from('accountability_partnerships')
        .select('*')
        .eq('id', partnership_id)
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active')
        .single();

      if (!partnership) {
        throw new Error('Partnership not found or unauthorized');
      }

      query = query.eq('partnership_id', partnership_id);
    } else {
      // Get all goals from all active partnerships
      const { data: partnerships } = await supabaseClient
        .from('accountability_partnerships')
        .select('id')
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active');

      const partnershipIds = partnerships?.map(p => p.id) || [];
      
      if (partnershipIds.length === 0) {
        return new Response(
          JSON.stringify({ goals: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      query = query.in('partnership_id', partnershipIds);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }

    console.log(`Fetched ${goals?.length || 0} goals`);

    return new Response(
      JSON.stringify({ goals: goals || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-partner-goals:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
