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
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No Authorization header found');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted:', token.substring(0, 20) + '...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user using the extracted token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user found after auth');
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);
    
    // Create an authenticated client for queries
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { partnership_id, days = 30 } = await req.json();

    console.log('Getting analytics for partnership:', partnership_id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get progress snapshots
    const { data: snapshots, error: snapshotsError } = await supabaseAdmin
      .from('partner_progress_snapshots')
      .select(`
        *,
        user:profiles!partner_progress_snapshots_user_id_fkey(full_name, email)
      `)
      .eq('partnership_id', partnership_id)
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (snapshotsError) throw snapshotsError;

    // Get streaks
    const { data: streaks, error: streaksError } = await supabaseAdmin
      .from('partner_streaks')
      .select(`
        *,
        user:profiles!partner_streaks_user_id_fkey(full_name, email)
      `)
      .eq('partnership_id', partnership_id);

    if (streaksError) throw streaksError;

    // Get achievements
    const { data: achievements, error: achievementsError } = await supabaseAdmin
      .from('partner_achievements')
      .select(`
        *,
        user:profiles!partner_achievements_user_id_fkey(full_name, email)
      `)
      .eq('partnership_id', partnership_id)
      .order('earned_at', { ascending: false })
      .limit(20);

    if (achievementsError) throw achievementsError;

    // Get partnership details
    const { data: partnership, error: partnershipError } = await supabaseAdmin
      .from('accountability_partnerships')
      .select(`
        *,
        user_profile:accountability_profiles!accountability_partnerships_user_id_fkey(
          *,
          profiles:user_id(full_name, email)
        ),
        partner_profile:accountability_profiles!accountability_partnerships_partner_id_fkey(
          *,
          profiles:user_id(full_name, email)
        )
      `)
      .eq('id', partnership_id)
      .single();

    if (partnershipError) throw partnershipError;

    // Calculate summary stats
    const userSnapshots = snapshots?.filter(s => s.user_id === user.id) || [];
    const partnerSnapshots = snapshots?.filter(s => s.user_id !== user.id) || [];

    const calculateStats = (data: any[]) => {
      const totalCompleted = data.reduce((sum, s) => sum + (s.goals_completed || 0), 0);
      const totalGoals = data.reduce((sum, s) => 
        sum + (s.goals_completed || 0) + (s.goals_partial || 0) + (s.goals_missed || 0), 0
      );
      const avgCompletionRate = data.length > 0
        ? data.reduce((sum, s) => sum + parseFloat(s.completion_rate || 0), 0) / data.length
        : 0;

      return {
        totalCompleted,
        totalGoals,
        completionRate: avgCompletionRate.toFixed(1),
      };
    };

    return new Response(
      JSON.stringify({
        partnership,
        snapshots,
        streaks,
        achievements,
        summary: {
          user: calculateStats(userSnapshots),
          partner: calculateStats(partnerSnapshots),
        },
      }),
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