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
    console.log('Subscribe-push function called');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Extract JWT token and decode it to get user ID
    // Since verify_jwt=true in config, Supabase already verified the token
    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    
    try {
      // Decode JWT to get user ID (token is already verified by Supabase)
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
      console.log('User ID from JWT:', userId);
      
      if (!userId) {
        throw new Error('No user ID in token');
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { subscription, deviceInfo } = await req.json();
    console.log('Subscription data received');
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      console.error('Invalid subscription data');
      return new Response(
        JSON.stringify({ error: 'Invalid subscription data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use admin client to insert subscription (bypasses RLS)
    console.log('Upserting subscription with admin client...');
    const { error: upsertError } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        device_info: deviceInfo,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Subscription saved successfully for user:', userId);

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
