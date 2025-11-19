import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import * as webpush from 'https://esm.sh/web-push@3.6.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push helper function with proper VAPID signing
async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: any,
  vapidDetails: { subject: string; publicKey: string; privateKey: string }
): Promise<boolean> {
  try {
    console.log('Sending to endpoint:', subscription.endpoint.substring(0, 50) + '...');
    
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    };

    // Set VAPID details for web-push
    webpush.setVapidDetails(
      vapidDetails.subject,
      vapidDetails.publicKey,
      vapidDetails.privateKey
    );

    // Send notification with proper VAPID signing
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    console.log('Push sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  console.log('=== Push notification request received ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Auth header present, creating client...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify admin role
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Role check error:', roleError);
    }

    if (!isAdmin) {
      console.error('User is not admin');
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Admin verified, parsing body...');
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const { title, body, targetUsers, userSegment, icon, badge, actionButtons, templateId } = requestBody;

    if (!title || !body) {
      console.error('Missing title or body');
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Creating notification log...');

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

    if (logError) {
      console.error('Failed to create notification log:', logError);
      throw logError;
    }

    console.log('Notification log created:', notificationLog.id);

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
    if (subError) {
      console.error('Failed to fetch subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);
    console.log('User segment:', userSegment);
    console.log('Target users:', targetUsers);

    const vapidDetails = {
      subject: Deno.env.get('VAPID_SUBJECT') ?? '',
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    };

    console.log('VAPID configured:', {
      hasSubject: !!vapidDetails.subject,
      hasPublicKey: !!vapidDetails.publicKey,
      hasPrivateKey: !!vapidDetails.privateKey
    });

    let sentCount = 0;
    let failedCount = 0;

    // Send notifications
    if (subscriptions && subscriptions.length > 0) {
      console.log('Preparing payload...');
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

      console.log('Sending notifications to', subscriptions.length, 'devices...');
      const results = await Promise.allSettled(
        subscriptions.map((sub, index) => {
          console.log(`Sending to device ${index + 1}/${subscriptions.length}`);
          return sendWebPushNotification(sub, payload, vapidDetails);
        })
      );

      console.log('Processing results...');
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled' && result.value) {
          sentCount++;
        } else {
          failedCount++;
          console.log(`Failed to send to device ${i + 1}:`, result.status === 'rejected' ? result.reason : 'Unknown');
          // Mark subscription as inactive if it failed
          await supabaseClient
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscriptions[i].id);
        }
      }
    } else {
      console.log('No active subscriptions found');
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

    console.log(`=== COMPLETE: ${sentCount} succeeded, ${failedCount} failed ===`);

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
    console.error('=== ERROR in send-push-notification ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
