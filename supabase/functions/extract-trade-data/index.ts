import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callGemini, generateFallbackResponse } from "../_shared/gemini-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let user;
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authedUser }, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError || !authedUser) {
        console.warn('Auth check failed - continuing with default context:', authError);
      } else {
        user = authedUser;
      }
    } catch (e) {
      console.error('Auth exception:', e);
    }

    // Default user ID if auth fails
    const currentUserId = user?.id || 'anonymous';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check AI credits
    let profile = null;
    if (user) {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('ai_credits, subscription_tier')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }
      profile = profileData;
    }

    const EXTRACTION_COST = 10;
    const isPremium = profile?.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(profile.subscription_tier);

    if (user && !isPremium && (!profile || profile.ai_credits < EXTRACTION_COST)) {
      return new Response(JSON.stringify({
        error: `Insufficient credits. Screenshot extraction costs ${EXTRACTION_COST} credits. You have ${profile?.ai_credits || 0} credits.`,
        required: EXTRACTION_COST,
        available: profile?.ai_credits || 0
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { image, imageUrl } = body;
    const imageData = image || imageUrl;

    if (!imageData) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isBase64 = imageData.startsWith('data:');
    console.log('Processing image:', isBase64 ? 'base64 data' : 'URL');

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log('Calling Gemini vision API...');

    // Build image part for Gemini
    let imagePart: any;
    if (isBase64) {
      imagePart = {
        inlineData: {
          mimeType: imageData.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          data: imageData.split(',')[1],
        }
      };
    } else {
      const imgResp = await fetch(imageData);
      const buf = await imgResp.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64 } };
    }

    const extractionPrompt = `You are an elite trading chart analyst. Extract ALL visible trading data and return ONLY a JSON object with no markdown code blocks.

Required fields if visible: pair, direction ("buy" or "sell"), entry_price (number), stop_loss (number), take_profit (number), exit_price (number), lot_size (number), profit_loss (number), setup_name (string), timeframe (string), session (string), risk_reward (string), result ("open"/"win"/"loss"/"breakeven"), emotion (string), notes (string), trade_timestamp (ISO string), platform (string).

DIRECTION DETECTION: If SL < Entry AND TP > Entry → "buy". If SL > Entry AND TP < Entry → "sell".

LONG/BUY: Stop Loss BELOW entry, Take Profit ABOVE entry, green candles, BUY/LONG labels, upward arrows.
SHORT/SELL: Stop Loss ABOVE entry, Take Profit BELOW entry, red candles, SELL/SHORT labels, downward arrows.

Return ONLY valid JSON like: {"pair":"EURUSD","direction":"buy","entry_price":1.0950,"stop_loss":1.0920,"take_profit":1.1000}`;

    // Call Gemini via Shared Client (Retries automatically on 429)
    let extractedData = null;
    try {
      const result = await callGemini({
        supabaseUrl: Deno.env.get('SUPABASE_URL')!,
        supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        userId: currentUserId,
        prompt: extractionPrompt,
        imagePart,
        skipUsageCheck: false,
      });

      let rawText = result.text.replace(/```json\n?|\n?```/g, '').trim();
      try {
        extractedData = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      }
    } catch (error) {
      console.error('Extraction failed after retries:', error);
      const originalError = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`AI Extraction Error: ${originalError}. Please wait 10 seconds and try again.`);
    }

    if (!extractedData) {
      throw new Error('Failed to extract trade data from image');
    }

    console.log('Extracted data:', JSON.stringify(extractedData).substring(0, 200));

    // Deduct credits (only for free users)
    if (user && !isPremium) {
      await supabaseAdmin
        .from('profiles')
        .update({ ai_credits: profile.ai_credits - EXTRACTION_COST })
        .eq('id', user.id);
    }

    return new Response(JSON.stringify({
      extracted_data: extractedData,
      confidence: 0.85,
      credits_remaining: profile?.ai_credits ? profile.ai_credits - EXTRACTION_COST : 'unlimited'
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in extract-trade-data:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
