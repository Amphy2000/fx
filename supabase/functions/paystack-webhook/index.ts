import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    const signature = req.headers.get('x-paystack-signature');
    if (!signature) {
      console.error('No signature provided');
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    const hash = createHmac('sha512', paystackSecret).update(body).digest('hex');

    if (hash !== signature) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);
    console.log('Paystack webhook event:', event.event);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.event === 'charge.success') {
      const { data: eventData } = event;
      const { reference, amount, customer, metadata } = eventData;

      const userId = metadata?.user_id;
      const planType = metadata?.plan_type;

      if (!userId || !planType) {
        console.error('Missing user_id or plan_type in metadata');
        return new Response(JSON.stringify({ error: 'Invalid metadata' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let expiresAt = null;
      let subscriptionTier = planType;

      if (planType === 'pro') {
        const now = new Date();
        expiresAt = new Date(now.setMonth(now.getMonth() + 1));
      }

      const { error: subError } = await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_type: planType,
        payment_reference: reference,
        amount: amount / 100,
        status: 'active',
        expires_at: expiresAt,
      });

      if (subError) {
        console.error('Error creating subscription:', subError);
        throw subError;
      }

      const updateData: any = {
        subscription_tier: subscriptionTier,
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
        monthly_trade_limit: null,
        ai_credits: planType === 'lifetime' ? 999999 : planType === 'pro' ? 500 : 50,
      };

      if (planType === 'lifetime') {
        updateData.credits_reset_date = null; // No reset for lifetime
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      // Handle coaching session payments
      if (planType === 'coaching_session' && metadata?.coach_id) {
        await supabase.from('coaching_sessions').insert({
          coach_id: metadata.coach_id,
          client_id: userId,
          amount_paid: amount / 100,
          payment_reference: reference,
          status: 'confirmed'
        });
      }

      // Handle group premium payments
      if (planType === 'group_premium' && metadata?.group_id) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await supabase.from('group_premium_subscriptions').upsert({
          group_id: metadata.group_id,
          tier: metadata.tier || 'pro',
          amount_paid: amount / 100,
          payment_reference: reference,
          status: 'active',
          expires_at: expiresAt
        });
      }

      console.log(`Successfully processed payment for user ${userId}, plan: ${planType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
