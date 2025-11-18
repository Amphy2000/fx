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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { subscription, deviceInfo } = await req.json();
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if subscription already exists
    const { data: existing } = await supabaseClient
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    if (existing) {
      // Update existing subscription
      const { error: updateError } = await supabaseClient
        .from('push_subscriptions')
        .update({
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          device_info: deviceInfo,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Subscription updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Insert new subscription
    const { error: insertError } = await supabaseClient
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        device_info: deviceInfo,
        is_active: true
      });

    if (insertError) throw insertError;

    console.log(`Push subscription created for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription created' }),
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
