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
          content: `Extract trading data from voice transcript. Return ONLY valid JSON with these fields: pair, direction (buy/sell), entry_price, stop_loss, take_profit. 
          
          Examples:
          - "long EURUSD at 1.0950 stop 1.0920 target 1.1000" -> {"pair":"EURUSD","direction":"buy","entry_price":"1.0950","stop_loss":"1.0920","take_profit":"1.1000"}
          - "short gold 2050 stop 2060 tp 2030" -> {"pair":"XAUUSD","direction":"sell","entry_price":"2050","stop_loss":"2060","take_profit":"2030"}
          - "buy GBPUSD 1.2650 SL 1.2620 TP 1.2700" -> {"pair":"GBPUSD","direction":"buy","entry_price":"1.2650","stop_loss":"1.2620","take_profit":"1.2700"}
          
          Common pairs: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, XAUUSD (gold), XAGUSD (silver), US30 (dow)
          Direction synonyms: long/buy, short/sell
          If any data is missing, set to null. Always return valid JSON only, no explanations.`
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
