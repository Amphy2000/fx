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

    const { goal_id, status, notes } = await req.json();

    if (!goal_id || !status) {
      throw new Error('Goal ID and status are required');
    }

    if (!['completed', 'missed', 'partial'].includes(status)) {
      throw new Error('Invalid status');
    }

    console.log('Submitting check-in for goal:', goal_id, 'status:', status);

    // Verify goal exists and belongs to user
    const { data: goal } = await supabaseClient
      .from('partner_goals')
      .select('*')
      .eq('id', goal_id)
      .eq('user_id', user.id)
      .single();

    if (!goal) {
      throw new Error('Goal not found or unauthorized');
    }

    // Check if check-in already exists for today
    const { data: existing } = await supabaseClient
      .from('goal_check_ins')
      .select('id')
      .eq('goal_id', goal_id)
      .eq('check_in_date', new Date().toISOString().split('T')[0])
      .single();

    if (existing) {
      // Update existing check-in
      const { data: updated, error: updateError } = await supabaseClient
        .from('goal_check_ins')
        .update({ status, notes })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating check-in:', updateError);
        throw updateError;
      }

      console.log('Check-in updated:', updated.id);

      return new Response(
        JSON.stringify({ check_in: updated, message: 'Check-in updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Create new check-in
      const { data: checkIn, error: insertError } = await supabaseClient
        .from('goal_check_ins')
        .insert({
          goal_id,
          user_id: user.id,
          status,
          notes
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating check-in:', insertError);
        throw insertError;
      }

      console.log('Check-in created:', checkIn.id);

      return new Response(
        JSON.stringify({ check_in: checkIn, message: 'Check-in submitted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in submit-goal-checkin:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
