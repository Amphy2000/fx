import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push helper functions
async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: { title: string; body: string; icon?: string; badge?: string },
  vapidDetails: { subject: string; publicKey: string; privateKey: string }
): Promise<boolean> {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    };

    // Create the web push request
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400'
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify admin role
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { title, body, targetUsers, userSegment, icon, badge, actionButtons, templateId } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create notification log entry
    const { data: notificationLog, error: logError } = await supabaseClient
      .from('push_notifications')
      .insert({
        admin_id: user.id,
        title,
        body,
        target_users: targetUsers || [],
        user_segment: userSegment || 'all',
        action_buttons: actionButtons || null,
        template_id: templateId || null,
        status: 'sending'
      })
      .select()
      .single();

    if (logError) throw logError;

    // Fetch active subscriptions based on segment
    let userIds: string[] = [];
    
    if (userSegment && userSegment !== 'all') {
      // Fetch users based on segment
      let userQuery = supabaseClient.from('profiles').select('id');
      
      switch (userSegment) {
        case 'free':
          userQuery = userQuery.eq('subscription_tier', 'free');
          break;
        case 'monthly':
          userQuery = userQuery.eq('subscription_tier', 'monthly');
          break;
        case 'lifetime':
          userQuery = userQuery.eq('subscription_tier', 'lifetime');
          break;
        case 'inactive':
          // Users who haven't logged a trade in 7 days
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          userQuery = userQuery.or(`last_trade_date.is.null,last_trade_date.lt.${sevenDaysAgo}`);
          break;
        case 'active':
          // Users who logged a trade in last 7 days
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          userQuery = userQuery.gte('last_trade_date', weekAgo);
          break;
      }
      
      const { data: users } = await userQuery;
      userIds = users?.map(u => u.id) || [];
    }

    let query = supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (userSegment && userSegment !== 'all' && userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else if (targetUsers && targetUsers.length > 0 && targetUsers[0] !== 'all') {
      query = query.in('user_id', targetUsers);
    }

    const { data: subscriptions, error: subError } = await query;
    if (subError) throw subError;

    console.log(`Sending push notifications to ${subscriptions?.length || 0} subscriptions`);

    const vapidDetails = {
      subject: Deno.env.get('VAPID_SUBJECT') ?? '',
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    };

    let sentCount = 0;
    let failedCount = 0;

    // Send notifications
    if (subscriptions && subscriptions.length > 0) {
      const payload = {
        title,
        body,
        icon: icon || '/pwa-192x192.png',
        badge: badge || '/favicon.png',
        data: {
          notificationId: notificationLog.id,
          actions: actionButtons || []
        }
      };

      const results = await Promise.allSettled(
        subscriptions.map(sub => 
          sendWebPushNotification(sub, payload, vapidDetails)
        )
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled' && result.value) {
          sentCount++;
        } else {
          failedCount++;
          // Mark subscription as inactive if it failed
          await supabaseClient
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscriptions[i].id);
        }
      }
    }

    // Update notification log
    await supabaseClient
      .from('push_notifications')
      .update({
        sent_count: sentCount,
        failed_count: failedCount,
        status: failedCount === 0 ? 'completed' : 'completed'
      })
      .eq('id', notificationLog.id);

    console.log(`Notification sent: ${sentCount} succeeded, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        failedCount,
        totalSubscriptions: subscriptions?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
