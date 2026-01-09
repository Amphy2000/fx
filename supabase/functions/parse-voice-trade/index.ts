import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { callGemini } from "../_shared/gemini-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VOICE_PARSE_COST = 1;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_credits, subscription_tier')
      .eq('id', user.id)
      .single();
    
    const isPremium = profile?.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(profile.subscription_tier);
    
    if (!isPremium && (!profile || profile.ai_credits < VOICE_PARSE_COST)) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { transcript } = await req.json();
    if (!transcript) {
      throw new Error('No transcript provided');
    }

    console.log('Parsing transcript:', transcript);

    const systemPrompt = `You are an expert trade data extractor. Extract ALL available trading information from speech transcripts with high accuracy.

CRITICAL PARSING RULES:
- Ignore repeated/duplicate words (common in speech recognition)
- Be flexible with numbers - handle both "1.08500" and "one point zero eight five"
- Extract ALL fields: pair, direction, entry_price, stop_loss, take_profit, exit_price, profit_loss, result, emotion_before, emotion_after, notes
- Common pairs: EURUSD, EUR/USD, GBPUSD, GBP/USD, USDJPY, USD/JPY, AUDUSD, USDCAD, XAUUSD (gold), XAGUSD (silver), US30, NAS100
- Direction variations: 
  * buy/long/went long/bought → "buy"
  * sell/short/went short/sold → "sell"
- Result variations:
  * win/won/profit/profitable/made money → "win"
  * loss/lost/losing/unprofitable/lost money → "loss"
  * breakeven/BE/scratch → "breakeven"
  * open/pending/still running/active → "open"
- For CLOSED trades (win/loss/breakeven):
  * exit_price: extract the closing/exit price (keywords: "closed at", "exited at", "exit price", "got out at")
  * profit_loss: extract P&L in dollars (keywords: "made", "lost", "profit", "loss", "plus", "minus", "+", "-", "$")
- Emotions (comprehensive list): calm, confident, anxious, greedy, fearful, disciplined, excited, frustrated, neutral, focused, impulsive, patient, stressed, relaxed, uncertain, optimistic
- Emotion timing keywords:
  * "before/entering/going in/initially" → emotion_before
  * "after/exiting/closing/result" → emotion_after
- Notes: capture ANY additional context like setup name, market conditions, lessons learned, mistakes made, what worked, what didn't

Return ONLY valid JSON object with these exact keys: pair, direction, entry_price, stop_loss, take_profit, exit_price, profit_loss, result, emotion_before, emotion_after, notes
Use null for missing values. NO extra text or explanations.`;

    // Parse trade data using Gemini
    const result = await callGemini({
      supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
      supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      userId: user.id,
      prompt: transcript,
      systemPrompt,
      cacheTtlMinutes: 5, // Short cache for voice parsing
      skipUsageCheck: isPremium,
    });

    console.log('Gemini response:', result.text);

    // Extract JSON from response (handle nested braces properly)
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract trade data from transcript');
    }

    const tradeData = JSON.parse(jsonMatch[0]);
    
    // Validate required pair
    if (!tradeData.pair) {
      console.error('Missing pair in parsed data:', tradeData);
      throw new Error('Could not identify the currency pair. Please specify which pair you traded (e.g., EURUSD, GBPUSD, Gold).');
    }

    // Smart direction inference if missing
    if (!tradeData.direction && tradeData.entry_price && tradeData.stop_loss) {
      const entry = parseFloat(tradeData.entry_price);
      const stop = parseFloat(tradeData.stop_loss);
      
      if (!isNaN(entry) && !isNaN(stop)) {
        // If stop loss is below entry, it's a buy. If above, it's a sell.
        tradeData.direction = stop < entry ? 'buy' : 'sell';
        console.log(`Inferred direction: ${tradeData.direction} (entry: ${entry}, stop: ${stop})`);
      }
    }

    // Final validation - now we only error if we truly can't determine direction
    if (!tradeData.direction) {
      console.error('Could not determine direction in parsed data:', tradeData);
      throw new Error('Could not determine if this is a buy or sell trade. Please specify "buy", "sell", "long", or "short", or provide both entry price and stop loss so direction can be inferred.');
    }

    // Deduct credits (only for free users)
    if (!isPremium) {
      await supabase
        .from('profiles')
        .update({ ai_credits: profile.ai_credits - VOICE_PARSE_COST })
        .eq('id', user.id);
    }

    console.log('Successfully parsed trade data:', tradeData);

    return new Response(
      JSON.stringify({ 
        tradeData,
        transcript 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Voice parse error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
