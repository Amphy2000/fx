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
    console.log('Subscribe-push function called with OneSignal');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
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
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Authenticated user:', user.id);

    const { oneSignalPlayerId, deviceInfo } = await req.json();
    console.log('OneSignal player ID received:', oneSignalPlayerId);
    
    if (!oneSignalPlayerId) {
      console.error('Missing OneSignal player ID');
      return new Response(
        JSON.stringify({ error: 'Missing OneSignal player ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Store the OneSignal player ID
    console.log('Upserting subscription with OneSignal player ID...');
    const { error: upsertError } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        onesignal_player_id: oneSignalPlayerId,
        device_info: deviceInfo,
        is_active: true,
        // Keep legacy fields as null for now
        endpoint: `onesignal://${oneSignalPlayerId}`,
        p256dh_key: '',
        auth_key: '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,onesignal_player_id'
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Subscription saved successfully for user:', user.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription saved' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in subscribe-push:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
