import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, verif-hash',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook signature
    const secretHash = Deno.env.get('FLUTTERWAVE_WEBHOOK_HASH');
    const signature = req.headers.get('verif-hash');
    
    if (secretHash && signature !== secretHash) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    console.log('Flutterwave webhook received:', JSON.stringify(payload));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle successful charge
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const data = payload.data;
      const meta = data.meta || {};
      
      const userId = meta.user_id;
      const planType = meta.plan_type;
      const affiliateId = meta.affiliate_id;
      const promoCode = meta.promo_code;
      const amount = data.amount;
      const txRef = data.tx_ref;
      const flwRef = data.flw_ref;

      if (!userId || !planType) {
        console.error('Missing user_id or plan_type in metadata');
        return new Response(
          JSON.stringify({ error: 'Missing metadata' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the transaction with Flutterwave
      const flutterwaveSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
      const verifyResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${data.id}/verify`, {
        headers: {
          'Authorization': `Bearer ${flutterwaveSecret}`,
        },
      });
      
      const verifyData = await verifyResponse.json();
      
      if (verifyData.status !== 'success' || verifyData.data.status !== 'successful') {
        console.error('Transaction verification failed:', verifyData);
        return new Response(
          JSON.stringify({ error: 'Transaction verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Processing successful payment for user ${userId}, plan: ${planType}`);

      // Calculate subscription details
      const now = new Date();
      const expiresAt = planType === 'lifetime' 
        ? null 
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const aiCredits = planType === 'lifetime' ? 999999 : 200;

      // Create subscription record
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          status: 'active',
          amount: amount,
          currency: 'NGN',
          payment_reference: txRef,
          payment_provider: 'flutterwave',
          expires_at: expiresAt,
          metadata: {
            flw_ref: flwRef,
            transaction_id: data.id,
          }
        })
        .select()
        .single();

      if (subError) {
        console.error('Error creating subscription:', subError);
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: planType === 'lifetime' ? 'lifetime' : 'pro',
          subscription_status: 'active',
          subscription_expires_at: expiresAt,
          ai_credits: aiCredits,
          credits_reset_date: expiresAt,
          monthly_trade_limit: 999999,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      // Record affiliate referral if applicable
      if (affiliateId && promoCode) {
        const { data: affiliate } = await supabase
          .from('affiliate_profiles')
          .select('commission_rate')
          .eq('id', affiliateId)
          .single();

        const commissionRate = affiliate?.commission_rate || 0.2;
        const commissionAmount = amount * commissionRate;

        await supabase
          .from('affiliate_referrals')
          .insert({
            affiliate_id: affiliateId,
            referred_user_id: userId,
            subscription_id: subscription?.id,
            plan_type: planType,
            amount: amount,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            promo_code: promoCode,
            status: 'completed',
            conversion_date: new Date().toISOString(),
          });

        // Update affiliate earnings
        await supabase
          .from('affiliate_profiles')
          .update({
            total_referrals: supabase.rpc('increment', { x: 1 }),
            pending_earnings: supabase.rpc('increment', { x: commissionAmount }),
            total_earnings: supabase.rpc('increment', { x: commissionAmount }),
          })
          .eq('id', affiliateId);
      }

      console.log(`Successfully processed payment for user ${userId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other events, just acknowledge
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
