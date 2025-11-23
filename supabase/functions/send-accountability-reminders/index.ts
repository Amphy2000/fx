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

    // Helper function to send notifications via multiple channels
    const sendNotification = async (userId: string, message: string, metadata: any) => {
      // Get user notification preferences
      const { data: profile } = await supabase
        .from('accountability_profiles')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single();

      const prefs = (profile?.notification_preferences as any) || {};

      // Send email if enabled
      if (prefs.enable_email && prefs.email_address) {
        try {
          const resendKey = Deno.env.get('RESEND_API_KEY');
          if (resendKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Accountability Partner <notifications@amphyjournal.com>',
                to: [prefs.email_address],
                subject: 'Accountability Reminder',
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Accountability Reminder</h2>
                    <p style="font-size: 16px; color: #555;">${message}</p>
                    <p style="color: #999; font-size: 14px; margin-top: 24px;">
                      This is an automated reminder from your accountability partnership.
                    </p>
                  </div>
                `,
              }),
            });
            console.log(`Email sent to ${prefs.email_address}`);
          }
        } catch (error) {
          console.error('Error sending email:', error);
        }
      }

      // Send Telegram if enabled
      if (prefs.enable_telegram && prefs.telegram_username) {
        try {
          const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
          if (telegramBotToken) {
            // Log telegram notification attempt
            console.log(`Telegram notification queued for ${prefs.telegram_username}: ${message}`);
            // Note: Full Telegram implementation would require chat_id lookup
          }
        } catch (error) {
          console.error('Error sending Telegram:', error);
        }
      }
    };

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
          const reminderMessage = `⏰ Reminder: Time to check in on your goal "${goal.goal_text}"`;
          
          // Send in-app notification
          await supabase.from('partner_messages').insert({
            partnership_id: partnership.id,
            sender_id: partnership.user_id === goal.user_id ? partnership.partner_id : partnership.user_id,
            message_type: 'system',
            is_system: true,
            content: reminderMessage,
            metadata: {
              type: 'goal_reminder',
              goal_id: goal.id,
            },
          });

          // Send via other channels
          await sendNotification(goal.user_id, reminderMessage, {
            type: 'goal_reminder',
            goal_id: goal.id,
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
        const engagementMessage = `👋 Hey! Your accountability partner might need some encouragement. Send them a message!`;
        
        // Send in-app notifications to both users
        await Promise.all([
          supabase.from('partner_messages').insert({
            partnership_id: partnership.id,
            sender_id: partnership.partner_id,
            message_type: 'system',
            is_system: true,
            content: engagementMessage,
            metadata: { type: 'engagement_reminder' },
          }),
          supabase.from('partner_messages').insert({
            partnership_id: partnership.id,
            sender_id: partnership.user_id,
            message_type: 'system',
            is_system: true,
            content: engagementMessage,
            metadata: { type: 'engagement_reminder' },
          }),
          sendNotification(partnership.user_id, engagementMessage, { type: 'engagement_reminder' }),
          sendNotification(partnership.partner_id, engagementMessage, { type: 'engagement_reminder' }),
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
        const overdueMessage = `⚠️ Goal overdue: "${goal.goal_text}" - Time to update the status!`;
        
        await supabase.from('partner_messages').insert({
          partnership_id: partnership.id,
          sender_id: partnership.user_id === goal.user_id ? partnership.partner_id : partnership.user_id,
          message_type: 'system',
          is_system: true,
          content: overdueMessage,
          metadata: {
            type: 'overdue_goal',
            goal_id: goal.id,
          },
        });

        await sendNotification(goal.user_id, overdueMessage, {
          type: 'overdue_goal',
          goal_id: goal.id,
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