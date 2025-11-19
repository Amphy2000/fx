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

    const startTime = Date.now();

    // Fetch active campaigns
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('notification_campaigns')
      .select('*')
      .eq('is_active', true);

    if (campaignsError) throw campaignsError;

    console.log(`Processing ${campaigns?.length || 0} active campaigns`);

    let totalProcessed = 0;
    let totalSent = 0;

    for (const campaign of campaigns || []) {
      try {
        const campaignStartTime = Date.now();
        const usersToNotify: string[] = [];

        // Get eligible users based on trigger type and conditions
        switch (campaign.trigger_type) {
          case 'inactivity': {
            const days = campaign.trigger_conditions.days || 7;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const { data: inactiveUsers } = await supabaseClient
              .from('profiles')
              .select('id')
              .or(`last_trade_date.is.null,last_trade_date.lt.${cutoffDate.toISOString()}`)
              .eq('subscription_tier', campaign.user_segment === 'all' ? undefined : campaign.user_segment);

            usersToNotify.push(...(inactiveUsers?.map(u => u.id) || []));
            break;
          }

          case 'milestone': {
            const milestoneType = campaign.trigger_conditions.milestone_type;
            
            if (milestoneType === 'first_trade') {
              const { data: newTraders } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('trades_count', 1);
              
              usersToNotify.push(...(newTraders?.map(u => u.id) || []));
            } else if (milestoneType === 'trade_count') {
              const targetCount = campaign.trigger_conditions.target_count || 10;
              const { data: traders } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('trades_count', targetCount);
              
              usersToNotify.push(...(traders?.map(u => u.id) || []));
            } else if (milestoneType === 'win_streak') {
              const targetStreak = campaign.trigger_conditions.target_streak || 5;
              const { data: streakers } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('current_streak', targetStreak);
              
              usersToNotify.push(...(streakers?.map(u => u.id) || []));
            }
            break;
          }

          case 'trade_count': {
            const minTrades = campaign.trigger_conditions.min_trades || 0;
            const maxTrades = campaign.trigger_conditions.max_trades;

            let query = supabaseClient
              .from('profiles')
              .select('id')
              .gte('trades_count', minTrades);

            if (maxTrades) {
              query = query.lte('trades_count', maxTrades);
            }

            if (campaign.user_segment !== 'all') {
              query = query.eq('subscription_tier', campaign.user_segment);
            }

            const { data: traders } = await query;
            usersToNotify.push(...(traders?.map(u => u.id) || []));
            break;
          }

          case 'win_streak': {
            const minStreak = campaign.trigger_conditions.min_streak || 3;
            const { data: streakers } = await supabaseClient
              .from('profiles')
              .select('id')
              .gte('current_streak', minStreak);

            usersToNotify.push(...(streakers?.map(u => u.id) || []));
            break;
          }

          case 'loss_streak': {
            const minLosses = campaign.trigger_conditions.min_losses || 3;
            // Check for consecutive losses in recent trades
            const { data: recentTrades } = await supabaseClient
              .from('trades')
              .select('user_id, result')
              .order('created_at', { ascending: false })
              .limit(100);

            // Group by user and check for consecutive losses
            const lossStreaks = new Map<string, number>();
            recentTrades?.forEach(trade => {
              if (trade.result === 'loss') {
                lossStreaks.set(trade.user_id, (lossStreaks.get(trade.user_id) || 0) + 1);
              } else if (trade.result === 'win') {
                lossStreaks.delete(trade.user_id);
              }
            });

            lossStreaks.forEach((losses, userId) => {
              if (losses >= minLosses) {
                usersToNotify.push(userId);
              }
            });
            break;
          }
        }

        // Remove duplicates
        const uniqueUsers = [...new Set(usersToNotify)];
        console.log(`Campaign "${campaign.name}": Found ${uniqueUsers.length} eligible users`);

        if (uniqueUsers.length > 0) {
          // Send notification
          const { error: sendError } = await supabaseClient.functions.invoke('send-push-notification', {
            body: {
              title: campaign.notification_title,
              body: campaign.notification_body,
              targetUsers: uniqueUsers,
              actionButtons: campaign.action_buttons,
              templateId: campaign.notification_template_id
            }
          });

          if (sendError) throw sendError;
          totalSent += uniqueUsers.length;
        }

        const executionTime = Date.now() - campaignStartTime;

        // Update campaign stats
        await supabaseClient
          .from('notification_campaigns')
          .update({
            last_run_at: new Date().toISOString(),
            total_triggered: campaign.total_triggered + 1,
            total_sent: campaign.total_sent + uniqueUsers.length
          })
          .eq('id', campaign.id);

        // Log campaign execution
        await supabaseClient
          .from('campaign_logs')
          .insert({
            campaign_id: campaign.id,
            users_matched: uniqueUsers.length,
            notifications_sent: uniqueUsers.length,
            execution_time_ms: executionTime
          });

        totalProcessed++;
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        
        // Log error
        await supabaseClient
          .from('campaign_logs')
          .insert({
            campaign_id: campaign.id,
            users_matched: 0,
            notifications_sent: 0,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
      }
    }

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        campaigns_processed: totalProcessed,
        total_notifications_sent: totalSent,
        execution_time_ms: totalTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing campaigns:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
