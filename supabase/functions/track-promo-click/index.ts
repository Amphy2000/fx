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
    const { promoCode } = await req.json();

    if (!promoCode) {
      return new Response(
        JSON.stringify({ error: "Promo code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get affiliate profile
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliate_profiles")
      .select("id")
      .eq("promo_code", promoCode.toUpperCase())
      .single();

    if (affiliateError || !affiliate) {
      console.log("Affiliate not found for code:", promoCode);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get visitor information
    const userAgent = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";
    
    // Parse UTM parameters from referer
    let utmSource = null;
    let utmMedium = null;
    let utmCampaign = null;
    try {
      const url = new URL(referer);
      utmSource = url.searchParams.get("utm_source");
      utmMedium = url.searchParams.get("utm_medium");
      utmCampaign = url.searchParams.get("utm_campaign");
    } catch (e) {
      // Ignore URL parsing errors
    }

    // Generate visitor ID from user agent and other fingerprinting data
    const visitorId = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(userAgent + Date.now())
    ).then(buf => Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32)
    );

    // Track the click
    const { error: insertError } = await supabase
      .from("promo_code_clicks")
      .insert({
        affiliate_id: affiliate.id,
        promo_code: promoCode.toUpperCase(),
        visitor_id: visitorId,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        referrer: referer,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error("Error tracking click:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in track-promo-click:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
