import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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
      .select('ai_credits')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.ai_credits < VOICE_PARSE_COST) {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Parse trade data using AI - enhanced to capture more fields
    const parseResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'system',
          content: `You are an expert trade data extractor. Extract ALL available trading information from speech transcripts with high accuracy.

CRITICAL PARSING RULES:
- Ignore repeated/duplicate words (common in speech recognition)
- Be flexible with numbers - handle both "1.08500" and "one point zero eight five"
- Extract ALL fields: pair, direction, entry_price, stop_loss, take_profit, result, emotion_before, emotion_after, notes
- Common pairs: EURUSD, EUR/USD, GBPUSD, GBP/USD, USDJPY, USD/JPY, AUDUSD, USDCAD, XAUUSD (gold), XAGUSD (silver), US30, NAS100
- Direction variations: 
  * buy/long/went long/bought → "buy"
  * sell/short/went short/sold → "sell"
- Result variations:
  * win/won/profit/profitable/made money → "win"
  * loss/lost/losing/unprofitable/lost money → "loss"
  * breakeven/BE/scratch → "breakeven"
  * open/pending/still running/active → "open"
- Emotions (comprehensive list): calm, confident, anxious, greedy, fearful, disciplined, excited, frustrated, neutral, focused, impulsive, patient, stressed, relaxed, uncertain, optimistic
- Emotion timing keywords:
  * "before/entering/going in/initially" → emotion_before
  * "after/exiting/closing/result" → emotion_after
- Notes: capture ANY additional context like setup name, market conditions, lessons learned, mistakes made, what worked, what didn't

COMPREHENSIVE EXAMPLES:

1. Full detail trade:
Input: "I went long on EUR/USD at 1.08500, stop loss was at 1.08000, take profit at 1.09000. Before entering I was feeling calm and confident. After closing it was a win and I felt excited. Followed my breakout setup perfectly."
Output: {"pair":"EURUSD","direction":"buy","entry_price":"1.08500","stop_loss":"1.08000","take_profit":"1.09000","result":"win","emotion_before":"calm","emotion_after":"excited","notes":"Followed breakout setup perfectly"}

2. Emotions and result focus:
Input: "Sold gold at 2050, stop 2060, target 2030. I was anxious and greedy going in. It hit my stop loss and I felt frustrated after. I should have waited for confirmation."
Output: {"pair":"XAUUSD","direction":"sell","entry_price":"2050","stop_loss":"2060","take_profit":"2030","result":"loss","emotion_before":"anxious","emotion_after":"frustrated","notes":"Should have waited for confirmation. Greedy entry."}

3. Open trade with emotions:
Input: "Bought GBP/USD at one point two six five zero, stop at one point two six two zero, still running. Feeling disciplined and patient before the trade."
Output: {"pair":"GBPUSD","direction":"buy","entry_price":"1.2650","stop_loss":"1.2620","take_profit":null,"result":"open","emotion_before":"disciplined","notes":null}

4. Simple entry:
Input: "Long EURUSD 1.0850 stop 1.0820 target 1.0920"
Output: {"pair":"EURUSD","direction":"buy","entry_price":"1.0850","stop_loss":"1.0820","take_profit":"1.0920","result":"open","emotion_before":null,"emotion_after":null,"notes":null}

5. With market conditions:
Input: "Short US30 at 38500, stop 38600, target 38200. Market was ranging, felt confident going in, trade is still open, respecting my risk management"
Output: {"pair":"US30","direction":"sell","entry_price":"38500","stop_loss":"38600","take_profit":"38200","result":"open","emotion_before":"confident","notes":"Market was ranging. Respecting risk management."}

Return ONLY valid JSON object with these exact keys: pair, direction, entry_price, stop_loss, take_profit, result, emotion_before, emotion_after, notes
Use null for missing values. NO extra text or explanations.`
        }, {
          role: 'user',
          content: transcript
        }],
        temperature: 0.1
      })
    });

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text();
      console.error('AI parsing error:', errorText);
      throw new Error(`AI parsing failed: ${errorText}`);
    }

    const parseResult = await parseResponse.json();
    const aiResponse = parseResult.choices[0].message.content;
    
    console.log('AI response:', aiResponse);

    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = aiResponse.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract trade data from transcript');
    }

    const tradeData = JSON.parse(jsonMatch[0]);

    // Deduct credits
    await supabase
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - VOICE_PARSE_COST })
      .eq('id', user.id);

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
