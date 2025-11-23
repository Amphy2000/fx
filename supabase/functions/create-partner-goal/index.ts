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

    const { partnership_id, goal_text, goal_type, target_date } = await req.json();

    if (!partnership_id || !goal_text || !goal_type) {
      throw new Error('Partnership ID, goal text, and goal type are required');
    }

    console.log('Creating goal for user:', user.id, 'partnership:', partnership_id);

    // Verify partnership exists and is active
    const { data: partnership } = await supabaseClient
      .from('accountability_partnerships')
      .select('*')
      .eq('id', partnership_id)
      .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq('status', 'active')
      .single();

    if (!partnership) {
      throw new Error('Active partnership not found');
    }

    // Create the goal
    const { data: goal, error: insertError } = await supabaseClient
      .from('partner_goals')
      .insert({
        partnership_id,
        user_id: user.id,
        goal_text,
        goal_type,
        target_date: target_date || null,
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating goal:', insertError);
      throw insertError;
    }

    console.log('Goal created:', goal.id);

    return new Response(
      JSON.stringify({ goal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-partner-goal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
