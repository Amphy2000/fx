import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planType, email, promoCode } = await req.json();

    if (!planType || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing planType or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const flutterwaveSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecret) {
      throw new Error('FLUTTERWAVE_SECRET_KEY not configured');
    }

    // Validate promo code if provided
    let affiliateId = null;
    let discount = 0;
    if (promoCode) {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      
      const { data: affiliate, error: affiliateError } = await adminSupabase
        .from("affiliate_profiles")
        .select("id, status")
        .eq("promo_code", promoCode.toUpperCase())
        .single();

      if (affiliate && affiliate.status === "active") {
        affiliateId = affiliate.id;
        discount = 0.10; // 10% discount for using promo code
      }
    }

    let amount: number;
    let planName: string;

    switch (planType) {
      case 'pro':
        amount = 7500; // ₦7,500
        planName = 'Pro Plan';
        break;
      case 'lifetime':
        amount = 30000; // ₦30,000
        planName = 'Lifetime Access';
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid plan type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Apply discount if promo code is valid
    if (discount > 0) {
      amount = Math.floor(amount * (1 - discount));
    }

    const txRef = `FX-${user.id.slice(0, 8)}-${Date.now()}`;
    const redirectUrl = `${req.headers.get('origin')}/dashboard?payment=success`;

    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amount,
        currency: 'NGN',
        redirect_url: redirectUrl,
        customer: {
          email: email,
        },
        meta: {
          user_id: user.id,
          plan_type: planType,
          plan_name: planName,
          affiliate_id: affiliateId,
          promo_code: promoCode?.toUpperCase() || null,
        },
        customizations: {
          title: 'FX Trading Journal',
          description: `Payment for ${planName}`,
          logo: 'https://fx.lovable.app/favicon.png',
        },
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();

    if (!flutterwaveResponse.ok || flutterwaveData.status !== 'success') {
      console.error('Flutterwave error:', flutterwaveData);
      throw new Error(flutterwaveData.message || 'Failed to initialize payment');
    }

    console.log(`Payment initialized for user ${user.id}, plan: ${planType}, tx_ref: ${txRef}`);

    return new Response(
      JSON.stringify({
        authorization_url: flutterwaveData.data.link,
        tx_ref: txRef,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
