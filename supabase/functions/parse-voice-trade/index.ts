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

    // Parse trade data using AI
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
          content: `You are a trade data extractor. Extract ONLY the trading information from noisy speech transcripts.

CRITICAL RULES:
- Ignore repeated/duplicate words (common in speech recognition)
- Extract the CORE trading info: pair, direction, entry, stop loss, take profit
- Common pairs: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, XAUUSD (gold), XAGUSD (silver), US30
- Direction: buy/long → "buy", sell/short → "sell"
- Return ONLY valid JSON, no explanations

EXAMPLES:
Input: "long EURUSD at 1.0950 stop 1.0920 target 1.1000"
Output: {"pair":"EURUSD","direction":"buy","entry_price":"1.0950","stop_loss":"1.0920","take_profit":"1.1000"}

Input: "short gold 2050 stop 2060 tp 2030"  
Output: {"pair":"XAUUSD","direction":"sell","entry_price":"2050","stop_loss":"2060","take_profit":"2030"}

Input: "mountMount usMount USDMount USD ads 1.095 stop 1.0 ads stop 1.0920"
Output: {"pair":"USDMOUNT","direction":"buy","entry_price":"1.095","stop_loss":"1.0920","take_profit":null}

If data is missing, use null. Return JSON only.`
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
