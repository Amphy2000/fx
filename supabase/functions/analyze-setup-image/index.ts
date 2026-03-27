import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { callGemini } from "../_shared/gemini-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANALYSIS_COST = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // User client for auth verification
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for credit management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check user credits
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ai_credits, subscription_tier")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.subscription_tier && ["pro", "lifetime", "monthly"].includes(profile.subscription_tier);

    if (!isPremium && (!profile || profile.ai_credits < ANALYSIS_COST)) {
      return new Response(
        JSON.stringify({
          error: "Insufficient credits",
          available: profile?.ai_credits || 0,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image } = await req.json();
    if (!image) throw new Error("No image provided");

    const analysisPrompt = `Analyze this trading chart screenshot with extreme precision. 
Identify entries, stop losses, and take profits. 
Give an overall Grade (A+ to F). 
Format in plain text with clear paragraph breaks. No markdown.`;

    // Process image for Gemini
    let imagePart = null;
    if (image.startsWith("data:")) {
      const [mime, base64] = image.split(",");
      imagePart = {
        inlineData: {
          mimeType: mime.split(":")[1].split(";")[0],
          data: base64,
        },
      };
    } else {
      // It's a URL
      const imgResp = await fetch(image);
      const buf = await imgResp.arrayBuffer();
      imagePart = {
        inlineData: {
          mimeType: "image/png",
          data: btoa(String.fromCharCode(...new Uint8Array(buf))),
        },
      };
    }

    const result = await callGemini({
      supabaseUrl,
      supabaseKey: supabaseServiceKey,
      userId: user.id,
      prompt: analysisPrompt,
      systemPrompt: "You are a professional institutional trading analyst.",
      imagePart,
      skipUsageCheck: false,
    });

    // Deduct credits
    if (!isPremium) {
      await supabaseAdmin
        .from("profiles")
        .update({ ai_credits: profile.ai_credits - ANALYSIS_COST })
        .eq("id", user.id);
    }

    return new Response(
      JSON.stringify({
        analysis: result.text,
        creditsUsed: isPremium ? 0 : ANALYSIS_COST,
        creditsRemaining: isPremium ? "unlimited" : profile.ai_credits - ANALYSIS_COST,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Setup analysis error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
