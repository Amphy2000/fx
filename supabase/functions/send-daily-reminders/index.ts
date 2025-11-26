import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Profile {
  id: string;
  email: string;
  display_name: string;
  checkin_reminder_enabled: boolean;
  checkin_reminder_time: string;
  checkin_reminder_channels: string[];
  telegram_chat_id: string | null;
  telegram_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily check-in reminder job...');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    console.log(`Current time: ${currentTime}, checking for reminders...`);

    // Find users who:
    // 1. Have reminders enabled
    // 2. Haven't checked in today
    // 3. Current time matches their reminder time (within 5 minutes)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name, checkin_reminder_enabled, checkin_reminder_time, checkin_reminder_channels, telegram_chat_id, telegram_notifications_enabled, email_notifications_enabled')
      .eq('checkin_reminder_enabled', true);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }

    console.log(`Found ${profiles?.length || 0} users with reminders enabled`);

    let remindersSet = 0;
    const errors: string[] = [];

    for (const profile of profiles as Profile[]) {
      // Check if user already checked in today
      const { data: checkIn } = await supabase
        .from('daily_checkins')
        .select('id')
        .eq('user_id', profile.id)
        .eq('check_in_date', today)
        .single();

      if (checkIn) {
        console.log(`User ${profile.id} already checked in today, skipping`);
        continue;
      }

      // Check if current time matches reminder time (within 5 minutes)
      const reminderTime = profile.checkin_reminder_time || '08:00:00';
      const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
      const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (reminderHour * 60 + reminderMinute));

      if (timeDiff > 5) {
        // Not time for this user's reminder yet
        continue;
      }

      console.log(`Sending reminder to user ${profile.id} (${profile.email})`);

      const channels = profile.checkin_reminder_channels || ['in_app'];
      const userName = profile.display_name || 'Trader';

      // In-app notification
      if (channels.includes('in_app')) {
        try {
          const { error: notifError } = await supabase
            .from('user_notifications')
            .insert({
              user_id: profile.id,
              title: "Time for your daily check-in! 🧘",
              message: `${userName}, track your mental state before trading today. It takes just 15 seconds.`,
              type: 'reminder',
              action_url: '/check-in',
              is_read: false
            });

          if (notifError) {
            console.error(`Failed to send in-app notification to ${profile.id}:`, notifError);
            errors.push(`In-app notification failed for ${profile.id}`);
          } else {
            console.log(`In-app notification sent to ${profile.id}`);
          }
        } catch (error) {
          console.error(`Error sending in-app notification:`, error);
        }
      }

      // Telegram notification
      if (channels.includes('telegram') && profile.telegram_chat_id && profile.telegram_notifications_enabled) {
        try {
          const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
          if (!telegramBotToken) {
            console.error('TELEGRAM_BOT_TOKEN not configured');
          } else {
            const telegramMessage = `🧘 Time for your daily check-in!\n\n${userName}, track your mental state before trading today.\n\nIt takes just 15 seconds and helps your AI coach find patterns.\n\n👉 Check in now: https://fx.lovable.app/check-in`;

            const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: profile.telegram_chat_id,
                text: telegramMessage,
                parse_mode: 'HTML'
              })
            });

            if (!telegramResponse.ok) {
              const errorText = await telegramResponse.text();
              console.error(`Telegram API error for ${profile.id}:`, errorText);
              errors.push(`Telegram failed for ${profile.id}`);
            } else {
              console.log(`Telegram notification sent to ${profile.id}`);
            }
          }
        } catch (error) {
          console.error(`Error sending Telegram notification:`, error);
        }
      }

      // Email notification
      if (channels.includes('email') && profile.email_notifications_enabled) {
        try {
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (!resendApiKey) {
            console.error('RESEND_API_KEY not configured');
          } else {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'Amphy AI <noreply@fx.lovable.app>',
                to: profile.email,
                subject: 'Time for your daily check-in 🧘',
                html: `
                  <h2>Hi ${userName}! 👋</h2>
                  <p>Time for your daily mental check-in before trading today.</p>
                  <p>It takes just 15 seconds and helps your AI coach find patterns in your performance.</p>
                  <p><a href="https://fx.lovable.app/check-in" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Check-In</a></p>
                  <p style="color: #666; font-size: 14px; margin-top: 20px;">You're receiving this because you enabled daily check-in reminders. You can adjust your notification preferences in Settings.</p>
                `
              })
            });

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error(`Email API error for ${profile.id}:`, errorText);
              errors.push(`Email failed for ${profile.id}`);
            } else {
              console.log(`Email notification sent to ${profile.id}`);
            }
          }
        } catch (error) {
          console.error(`Error sending email notification:`, error);
        }
      }

      remindersSet++;
    }

    console.log(`Daily reminder job complete: ${remindersSet} reminders sent`);
    if (errors.length > 0) {
      console.log(`Errors encountered: ${errors.join(', ')}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: remindersSet,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Error in send-daily-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
