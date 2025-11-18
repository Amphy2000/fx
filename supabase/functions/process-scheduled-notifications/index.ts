import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch due scheduled notifications
    const now = new Date().toISOString();
    const { data: scheduledNotifs, error: fetchError } = await supabaseClient
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (fetchError) throw fetchError;

    console.log(`Found ${scheduledNotifs?.length || 0} scheduled notifications to process`);

    let processedCount = 0;
    let failedCount = 0;

    for (const notif of scheduledNotifs || []) {
      try {
        // Send the notification
        const { error: sendError } = await supabaseClient.functions.invoke('send-push-notification', {
          body: {
            title: notif.title,
            body: notif.body,
            userSegment: notif.user_segment,
            actionButtons: notif.action_buttons,
            templateId: notif.template_id
          }
        });

        if (sendError) throw sendError;

        // Mark as sent
        await supabaseClient
          .from('scheduled_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notif.id);

        processedCount++;

        // Handle recurrence
        if (notif.recurrence) {
          const nextSchedule = calculateNextSchedule(notif.scheduled_for, notif.recurrence);
          if (nextSchedule) {
            await supabaseClient
              .from('scheduled_notifications')
              .insert({
                title: notif.title,
                body: notif.body,
                user_segment: notif.user_segment,
                scheduled_for: nextSchedule,
                recurrence: notif.recurrence,
                template_id: notif.template_id,
                action_buttons: notif.action_buttons,
                created_by: notif.created_by,
                status: 'pending'
              });
          }
        }
      } catch (error) {
        console.error(`Failed to process notification ${notif.id}:`, error);
        await supabaseClient
          .from('scheduled_notifications')
          .update({ status: 'failed' })
          .eq('id', notif.id);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        failed: failedCount,
        total: scheduledNotifs?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function calculateNextSchedule(currentSchedule: string, recurrence: string): string | null {
  const current = new Date(currentSchedule);
  
  switch (recurrence) {
    case 'daily':
      current.setDate(current.getDate() + 1);
      return current.toISOString();
    case 'weekly':
      current.setDate(current.getDate() + 7);
      return current.toISOString();
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      return current.toISOString();
    default:
      return null;
  }
}
