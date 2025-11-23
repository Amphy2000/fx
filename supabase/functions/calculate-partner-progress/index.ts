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

    // Store progress snapshots
    const snapshots = [];
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