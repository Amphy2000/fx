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

    const { partnership_id, week_start, week_end, summary_data } = await req.json();

    if (!partnership_id || !week_start || !week_end || !summary_data) {
      throw new Error('Partnership ID, week dates, and summary data are required');
    }

    console.log('Sharing weekly summary for partnership:', partnership_id);

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

    // Check if summary already exists for this week
    const { data: existing } = await supabaseClient
      .from('partner_weekly_shares')
      .select('id')
      .eq('user_id', user.id)
      .eq('partnership_id', partnership_id)
      .eq('week_start', week_start)
      .eq('week_end', week_end)
      .single();

    if (existing) {
      // Update existing summary
      const { data: updated, error: updateError } = await supabaseClient
        .from('partner_weekly_shares')
        .update({ summary_data })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating summary:', updateError);
        throw updateError;
      }

      console.log('Weekly summary updated:', updated.id);

      return new Response(
        JSON.stringify({ summary: updated, message: 'Summary updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Create new summary
      const { data: created, error: insertError } = await supabaseClient
        .from('partner_weekly_shares')
        .insert({
          user_id: user.id,
          partnership_id,
          week_start,
          week_end,
          summary_data
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating summary:', insertError);
        throw insertError;
      }

      console.log('Weekly summary created:', created.id);

      return new Response(
        JSON.stringify({ summary: created, message: 'Summary shared' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in share-weekly-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
