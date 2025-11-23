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

    console.log('Running accountability reminders...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get active partnerships
    const { data: partnerships } = await supabase
      .from('accountability_partnerships')
      .select('id, user_id, partner_id')
      .eq('status', 'active');

    if (!partnerships || partnerships.length === 0) {
      console.log('No active partnerships found');
      return new Response(
        JSON.stringify({ message: 'No active partnerships' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let remindersSent = 0;

    for (const partnership of partnerships) {
      // Check for pending goals that need check-ins
      const { data: pendingGoals } = await supabase
        .from('partner_goals')
        .select('id, user_id, goal_text')
        .eq('partnership_id', partnership.id)
        .eq('status', 'active')
        .lte('target_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      for (const goal of pendingGoals || []) {
        // Check if user checked in today
        const { data: checkIn } = await supabase
          .from('goal_check_ins')
          .select('id')
          .eq('goal_id', goal.id)
          .eq('check_in_date', today)
          .single();

        if (!checkIn) {
          // Send reminder notification
          await supabase.from('partner_messages').insert({
            partnership_id: partnership.id,
            sender_id: partnership.user_id === goal.user_id ? partnership.partner_id : partnership.user_id,
            message_type: 'system',
            content: `⏰ Reminder: Time to check in on your goal "${goal.goal_text}"`,
            metadata: {
              type: 'goal_reminder',
              goal_id: goal.id,
            },
          });

          remindersSent++;
        }
      }

      // Check for inactive partnerships (no messages in 3 days)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentMessages, count } = await supabase
        .from('partner_messages')
        .select('*', { count: 'exact', head: true })
        .eq('partnership_id', partnership.id)
        .gte('created_at', threeDaysAgo);

      if (count === 0) {
        // Send engagement reminder to both users
        await Promise.all([
          supabase.from('partner_messages').insert({
            partnership_id: partnership.id,
            sender_id: partnership.partner_id,
            message_type: 'system',
            content: `👋 Hey! Your accountability partner might need some encouragement. Send them a message!`,
            metadata: { type: 'engagement_reminder' },
          }),
          supabase.from('partner_messages').insert({
            partnership_id: partnership.id,
            sender_id: partnership.user_id,
            message_type: 'system',
            content: `👋 Hey! Your accountability partner might need some encouragement. Send them a message!`,
            metadata: { type: 'engagement_reminder' },
          }),
        ]);

        remindersSent += 2;
      }

      // Check for overdue goals
      const { data: overdueGoals } = await supabase
        .from('partner_goals')
        .select('id, user_id, goal_text, target_date')
        .eq('partnership_id', partnership.id)
        .eq('status', 'active')
        .lt('target_date', now.toISOString());

      for (const goal of overdueGoals || []) {
        await supabase.from('partner_messages').insert({
          partnership_id: partnership.id,
          sender_id: partnership.user_id === goal.user_id ? partnership.partner_id : partnership.user_id,
          message_type: 'system',
          content: `⚠️ Goal overdue: "${goal.goal_text}" - Time to update the status!`,
          metadata: {
            type: 'overdue_goal',
            goal_id: goal.id,
          },
        });

        remindersSent++;
      }
    }

    console.log(`Sent ${remindersSent} reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        partnerships_checked: partnerships.length,
        reminders_sent: remindersSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});