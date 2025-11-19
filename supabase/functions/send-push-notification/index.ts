import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID helper functions using native Web Crypto API
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function generateVAPIDHeaders(
  endpoint: string,
  vapidDetails: { subject: string; publicKey: string; privateKey: string }
): Promise<Record<string, string>> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const vapidHeaders = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const exp = Math.floor(Date.now() / 1000) + (12 * 60 * 60); // 12 hours
  
  const vapidClaims = {
    aud: audience,
    exp: exp,
    sub: vapidDetails.subject
  };

  // Import private key - Create a new Uint8Array with proper ArrayBuffer type
  const tempArray = urlBase64ToUint8Array(vapidDetails.privateKey);
  const privateKeyData = new Uint8Array(tempArray);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Create JWT
  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(vapidHeaders)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const claimsBase64 = btoa(JSON.stringify(vapidClaims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const unsignedToken = `${headerBase64}.${claimsBase64}`;
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(unsignedToken)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const jwt = `${unsignedToken}.${signatureBase64}`;

  return {
    'Authorization': `vapid t=${jwt}, k=${vapidDetails.publicKey}`,
    'Crypto-Key': `p256ecdsa=${vapidDetails.publicKey}`
  };
}

// Web Push notification sender with proper VAPID
async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: any,
  vapidDetails: { subject: string; publicKey: string; privateKey: string }
): Promise<boolean> {
  try {
    console.log('Sending to endpoint:', subscription.endpoint.substring(0, 50) + '...');
    
    const vapidHeaders = await generateVAPIDHeaders(subscription.endpoint, vapidDetails);
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        ...vapidHeaders
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Push failed:', response.status, await response.text());
      return false;
    }

    console.log('Push sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    console.log('=== Push notification request received ===');
    console.log('Method:', req.method);
    console.log('Has Authorization header:', !!req.headers.get('Authorization'));
    
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      return new Response(null, { headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Auth header present, extracting token...');

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Create service role client for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user from JWT using service role client
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
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
        status: sentCount > 0 ? 'completed' : 'failed'
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
