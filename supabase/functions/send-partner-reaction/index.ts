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

    const { check_in_id, reaction_type, message } = await req.json();

    if (!check_in_id || !reaction_type) {
      throw new Error('Check-in ID and reaction type are required');
    }

    if (!['like', 'celebrate', 'support', 'motivate'].includes(reaction_type)) {
      throw new Error('Invalid reaction type');
    }

    console.log('Sending reaction to check-in:', check_in_id);

    // Verify check-in exists and user is a partner
    const { data: checkIn } = await supabaseClient
      .from('goal_check_ins')
      .select(`
        *,
        goal:partner_goals(
          *,
          partnership:accountability_partnerships(*)
        )
      `)
      .eq('id', check_in_id)
      .single();

    if (!checkIn) {
      throw new Error('Check-in not found');
    }

    const partnership = (checkIn as any).goal.partnership;
    const isPartner = partnership.user_id === user.id || partnership.partner_id === user.id;
    const isOwner = checkIn.user_id === user.id;

    if (!isPartner) {
      throw new Error('Unauthorized - not a partner');
    }

    if (isOwner) {
      throw new Error('Cannot react to your own check-in');
    }

    // Check if reaction already exists
    const { data: existing } = await supabaseClient
      .from('partner_reactions')
      .select('id')
      .eq('check_in_id', check_in_id)
      .eq('reactor_id', user.id)
      .single();

    if (existing) {
      // Update existing reaction
      const { data: updated, error: updateError } = await supabaseClient
        .from('partner_reactions')
        .update({ reaction_type, message })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating reaction:', updateError);
        throw updateError;
      }

      console.log('Reaction updated:', updated.id);

      return new Response(
        JSON.stringify({ reaction: updated, message: 'Reaction updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Create new reaction
      const { data: reaction, error: insertError } = await supabaseClient
        .from('partner_reactions')
        .insert({
          check_in_id,
          reactor_id: user.id,
          reaction_type,
          message
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating reaction:', insertError);
        throw insertError;
      }

      console.log('Reaction created:', reaction.id);

      return new Response(
        JSON.stringify({ reaction, message: 'Reaction sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in send-partner-reaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
