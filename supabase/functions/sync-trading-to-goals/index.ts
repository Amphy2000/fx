import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, partnershipId } = await req.json();

    console.log('Syncing trading data to goals for user:', userId);

    // Get user's active goals
    const { data: goals } = await supabase
      .from('partner_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!goals || goals.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active goals found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recent trades
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    let goalsUpdated = 0;
    let notificationsSent = 0;

    for (const goal of goals) {
      const goalType = goal.goal_type;
      let progress = 0;
      let targetMet = false;

      // Calculate progress based on goal type
      if (goalType === 'win_rate') {
        const totalTrades = trades?.length || 0;
        const winningTrades = trades?.filter(t => t.result === 'win').length || 0;
        progress = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const targetRate = parseFloat(goal.goal_text.match(/\d+/)?.[0] || '0');
        targetMet = progress >= targetRate;
      } else if (goalType === 'profit_target') {
        const totalPnl = trades?.reduce((sum, t) => sum + (t.profit_loss || 0), 0) || 0;
        progress = totalPnl;
        const targetProfit = parseFloat(goal.goal_text.match(/\d+/)?.[0] || '0');
        targetMet = progress >= targetProfit;
      } else if (goalType === 'trade_count') {
        progress = trades?.length || 0;
        const targetCount = parseFloat(goal.goal_text.match(/\d+/)?.[0] || '0');
        targetMet = progress >= targetCount;
      } else if (goalType === 'streak') {
        // Check consecutive trading days
        const tradeDates = trades?.map(t => new Date(t.created_at).toISOString().split('T')[0]) || [];
        const uniqueDates = [...new Set(tradeDates)].sort();
        let currentStreak = 0;
        for (let i = uniqueDates.length - 1; i >= 0; i--) {
          const date = new Date(uniqueDates[i]);
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - currentStreak);
          if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
            currentStreak++;
          } else {
            break;
          }
        }
        progress = currentStreak;
        const targetStreak = parseFloat(goal.goal_text.match(/\d+/)?.[0] || '0');
        targetMet = progress >= targetStreak;
      }

      // Auto-create check-in with progress
      const today = new Date().toISOString().split('T')[0];
      const { data: existingCheckIn } = await supabase
        .from('goal_check_ins')
        .select('id')
        .eq('goal_id', goal.id)
        .eq('check_in_date', today)
        .single();

      if (!existingCheckIn && trades && trades.length > 0) {
        const status = targetMet ? 'completed' : progress >= (parseFloat(goal.goal_text.match(/\d+/)?.[0] || '0') * 0.7) ? 'partial' : 'missed';
        
        await supabase.from('goal_check_ins').insert({
          goal_id: goal.id,
          user_id: userId,
          status: status,
          notes: `Auto-synced from trading data. Progress: ${progress.toFixed(2)}`,
          check_in_date: today,
        });

        goalsUpdated++;

        // If goal is completed, update goal status and notify partner
        if (targetMet) {
          await supabase
            .from('partner_goals')
            .update({ status: 'completed' })
            .eq('id', goal.id);

          // Get partnership
          const { data: partnership } = await supabase
            .from('accountability_partnerships')
            .select('user_id, partner_id')
            .eq('id', partnershipId || goal.partnership_id)
            .single();

          if (partnership) {
            const partnerId = partnership.user_id === userId ? partnership.partner_id : partnership.user_id;
            
            await supabase.from('partner_messages').insert({
              partnership_id: partnershipId || goal.partnership_id,
              sender_id: partnerId,
              message_type: 'system',
              content: `🎉 Your partner just completed their goal: "${goal.goal_text}"! Send them some encouragement!`,
              metadata: {
                type: 'goal_completed',
                goal_id: goal.id,
              },
            });

            notificationsSent++;
          }
        }
      }
    }

    console.log(`Updated ${goalsUpdated} goals, sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        goals_updated: goalsUpdated,
        notifications_sent: notificationsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing trading to goals:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});