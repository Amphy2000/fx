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
      console.error('Config Error: FLUTTERWAVE_SECRET_KEY is missing');
      return new Response(
        JSON.stringify({ error: 'System configuration error: Flutterwave key is missing. Please set it in Lovable secrets.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate promo code if provided
    let affiliateId = null;
    let discount = 0;
    if (promoCode) {
      console.log(`Validating promo code: ${promoCode}`);
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (!serviceRoleKey) {
        console.error('Config Error: SUPABASE_SERVICE_ROLE_KEY is missing');
      } else {
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: affiliate, error: affiliateError } = await adminSupabase
          .from("affiliate_profiles")
          .select("id, status")
          .eq("promo_code", promoCode.toUpperCase())
          .single();

        if (affiliate && affiliate.status === "active") {
          affiliateId = affiliate.id;
          discount = 0.10; // 10% discount for using promo code
          console.log(`Promo code valid. Affiliate ID: ${affiliateId}`);
        } else {
          console.warn(`Promo code invalid or inactive: ${promoCode}`);
        }
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
      case 'bundle':
        amount = 15000; // ₦15,000
        planName = 'Flash Sale Bundle';
        break;
      default:
        console.error(`Invalid plan type: ${planType}`);
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
    const origin = req.headers.get('origin') || 'https://amphyai.vercel.app';
    const redirectUrl = `${origin}/dashboard?payment=success`;

    console.log(`Requesting payment from Flutterwave for ${email}, amount: ${amount}`);

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
      console.error('Flutterwave error response:', flutterwaveData);
      return new Response(
        JSON.stringify({ error: flutterwaveData.message || 'Payment provider error. Check your Flutterwave keys.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Payment initialized successfully. tx_ref: ${txRef}`);

    return new Response(
      JSON.stringify({
        authorization_url: flutterwaveData.data.link,
        tx_ref: txRef,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled error in initialize-payment:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
