import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionButton {
  title: string;
  url: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Send push notification called');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: hasAdminRole } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { 
      title, 
      body, 
      targetUsers, 
      userSegment = 'all',
      actionButtons,
      templateId 
    } = await req.json();

    console.log('Notification request:', { title, body, userSegment, targetUsers });

    // Create notification log
    const { data: notificationLog, error: logError } = await supabaseAdmin
      .from('push_notifications')
      .insert({
        admin_id: user.id,
        title,
        body,
        target_users: targetUsers || [],
        user_segment: userSegment,
        action_buttons: actionButtons || null,
        template_id: templateId || null,
        status: 'sending'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating notification log:', logError);
      throw logError;
    }

    // Get OneSignal configuration
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!oneSignalAppId || !oneSignalApiKey) {
      throw new Error('OneSignal configuration missing');
    }

    // Build query for subscriptions
    let query = supabaseAdmin
      .from('push_subscriptions')
      .select('user_id, onesignal_player_id, device_info')
      .eq('is_active', true)
      .not('onesignal_player_id', 'is', null);

    // Filter by target users or segment
    if (targetUsers && targetUsers.length > 0) {
      query = query.in('user_id', targetUsers);
    } else if (userSegment === 'active') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: activeUsers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .gte('updated_at', oneWeekAgo.toISOString());

      if (activeUsers && activeUsers.length > 0) {
        query = query.in('user_id', activeUsers.map(u => u.id));
      }
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found');
      await supabaseAdmin
        .from('push_notifications')
        .update({ status: 'completed', sent_count: 0 })
        .eq('id', notificationLog.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active subscriptions found',
          sent: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Extract OneSignal player IDs
    const playerIds = subscriptions
      .map(sub => sub.onesignal_player_id)
      .filter(id => id !== null);

    if (playerIds.length === 0) {
      throw new Error('No valid OneSignal player IDs found');
    }

    // Prepare OneSignal notification payload
    const oneSignalPayload: any = {
      app_id: oneSignalAppId,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      data: {
        notificationId: notificationLog.id
      }
    };

    // Add action buttons if provided
    if (actionButtons && actionButtons.length > 0) {
      oneSignalPayload.buttons = actionButtons.map((btn: ActionButton) => ({
        id: btn.url,
        text: btn.title,
        url: btn.url
      }));
    }

    console.log('Sending to OneSignal:', { 
      playerCount: playerIds.length,
      title,
      body
    });

    // Send notification via OneSignal API
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const oneSignalResult = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      console.error('OneSignal API error:', oneSignalResult);
      throw new Error(`OneSignal API error: ${JSON.stringify(oneSignalResult)}`);
    }

    console.log('OneSignal response:', oneSignalResult);

    const sentCount = oneSignalResult.recipients || playerIds.length;
    const failedCount = playerIds.length - sentCount;

    // Update notification log with results
    await supabaseAdmin
      .from('push_notifications')
      .update({
        status: 'completed',
        sent_count: sentCount,
        failed_count: failedCount
      })
      .eq('id', notificationLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notifications sent via OneSignal',
        sent: sentCount,
        failed: failedCount,
        oneSignalId: oneSignalResult.id
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
