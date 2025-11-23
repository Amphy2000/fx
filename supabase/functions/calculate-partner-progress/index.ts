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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { partnership_id } = await req.json();

    console.log('Calculating progress for partnership:', partnership_id);

    // Get partnership details
    const { data: partnership, error: partnershipError } = await supabaseClient
      .from('accountability_partnerships')
      .select('user_id, partner_id')
      .eq('id', partnership_id)
      .single();

    if (partnershipError) throw partnershipError;

    // Calculate trading stats for both users
    const calculateUserStats = async (userId: string) => {
      const { data: trades } = await supabaseClient
        .from('trades')
        .select('profit_loss, result')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const totalTrades = trades?.length || 0;
      const winningTrades = trades?.filter(t => t.result === 'win').length || 0;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      const totalProfit = trades?.filter(t => t.profit_loss > 0)
        .reduce((sum, t) => sum + t.profit_loss, 0) || 0;
      const totalLoss = Math.abs(trades?.filter(t => t.profit_loss < 0)
        .reduce((sum, t) => sum + t.profit_loss, 0) || 0);
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

      return { totalTrades, winRate, profitFactor };
    };

    const [user1Stats, user2Stats] = await Promise.all([
      calculateUserStats(partnership.user_id),
      calculateUserStats(partnership.partner_id),
    ]);

    // Get all active goals for this partnership
    const { data: goals, error: goalsError } = await supabaseClient
      .from('partner_goals')
      .select(`
        id,
        user_id,
        check_ins:goal_check_ins(status, check_in_date)
      `)
      .eq('partnership_id', partnership_id)
      .eq('status', 'active');

    if (goalsError) throw goalsError;

    // Calculate progress for each user in the partnership
    const progressByUser = new Map();

    for (const goal of goals || []) {
      if (!progressByUser.has(goal.user_id)) {
        progressByUser.set(goal.user_id, {
          completed: 0,
          partial: 0,
          missed: 0,
          total: 0,
        });
      }

      const userProgress = progressByUser.get(goal.user_id);
      const todayCheckIn = goal.check_ins?.find(
        (ci: any) => ci.check_in_date === new Date().toISOString().split('T')[0]
      );

      if (todayCheckIn) {
        userProgress.total++;
        if (todayCheckIn.status === 'completed') userProgress.completed++;
        else if (todayCheckIn.status === 'partial') userProgress.partial++;
        else if (todayCheckIn.status === 'missed') userProgress.missed++;
      }
    }

    // Store progress snapshots and calculate engagement score
    const snapshots = [];
    let totalEngagement = 0;
    
    for (const [user_id, progress] of progressByUser.entries()) {
      const completionRate = progress.total > 0
        ? ((progress.completed / progress.total) * 100).toFixed(2)
        : 0;

      // Get current streak
      const { data: streak } = await supabaseClient
        .from('partner_streaks')
        .select('current_streak')
        .eq('user_id', user_id)
        .eq('partnership_id', partnership_id)
        .eq('streak_type', 'check_in')
        .single();

      totalEngagement += progress.total + (streak?.current_streak || 0);

      snapshots.push({
        user_id,
        partnership_id,
        snapshot_date: new Date().toISOString().split('T')[0],
        goals_completed: progress.completed,
        goals_partial: progress.partial,
        goals_missed: progress.missed,
        completion_rate: completionRate,
        streak_count: streak?.current_streak || 0,
      });
    }

    // Store partnership analytics
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const totalGoals = Array.from(progressByUser.values()).reduce((sum, p) => sum + p.total, 0);
    const completedGoals = Array.from(progressByUser.values()).reduce((sum, p) => sum + p.completed, 0);
    const avgCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    await supabaseClient
      .from('partnership_analytics')
      .upsert({
        partnership_id,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        combined_win_rate: (user1Stats.winRate + user2Stats.winRate) / 2,
        combined_profit_factor: (user1Stats.profitFactor + user2Stats.profitFactor) / 2,
        total_goals_completed: completedGoals,
        total_goals_set: totalGoals,
        completion_rate: avgCompletionRate,
        engagement_score: totalEngagement + user1Stats.totalTrades + user2Stats.totalTrades,
        calculated_at: new Date().toISOString(),
      }, {
        onConflict: 'partnership_id,week_start',
      });

    // Upsert snapshots
    for (const snapshot of snapshots) {
      const { error: snapshotError } = await supabaseClient
        .from('partner_progress_snapshots')
        .upsert(snapshot, {
          onConflict: 'user_id,partnership_id,snapshot_date',
        });

      if (snapshotError) {
        console.error('Error storing snapshot:', snapshotError);
      }
    }

    // Check for achievements
    for (const [user_id, progress] of progressByUser.entries()) {
      // Perfect week achievement
      if (progress.completed >= 7 && progress.missed === 0) {
        await supabaseClient.from('partner_achievements').insert({
          user_id,
          partnership_id,
          achievement_type: 'perfect_week',
          achievement_data: { week: new Date().toISOString().split('T')[0] },
        });
      }

      // Consistency achievement (5+ check-ins)
      if (progress.total >= 5) {
        await supabaseClient.from('partner_achievements').insert({
          user_id,
          partnership_id,
          achievement_type: 'consistency',
          achievement_data: { count: progress.total },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, snapshots }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});