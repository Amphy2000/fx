import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Check credits using Supabase client
    const { data: profiles } = await supabase
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();
    
    const profile = profiles;
    
    if (!profile || profile.ai_credits < VOICE_PARSE_COST) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { audio } = await req.json();
    if (!audio) throw new Error('No audio data provided');

    // Process audio in chunks to avoid memory issues
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    // Transcribe with Whisper
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: formData,
    });

    if (!whisperResponse.ok) {
      throw new Error(`Whisper API error: ${await whisperResponse.text()}`);
    }

    const { text: transcript } = await whisperResponse.json();

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
          content: `Extract trading data from voice transcript. Return JSON with: pair, direction (buy/sell), entry_price, stop_loss, take_profit. 
          Examples:
          - "long EURUSD at 1.0950 stop 1.0920 target 1.1000" -> {"pair":"EURUSD","direction":"buy","entry_price":"1.0950","stop_loss":"1.0920","take_profit":"1.1000"}
          - "short gold 2050 stop 2060 tp 2030" -> {"pair":"XAUUSD","direction":"sell","entry_price":"2050","stop_loss":"2060","take_profit":"2030"}
          If data is missing, set to null. Always return valid JSON.`
        }, {
          role: 'user',
          content: transcript
        }],
        temperature: 0.1
      })
    });

    const parseResult = await parseResponse.json();
    const tradeDataText = parseResult.choices?.[0]?.message?.content;
    
    let tradeData;
    try {
      tradeData = JSON.parse(tradeDataText);
    } catch {
      // If AI didn't return pure JSON, try to extract it
      const jsonMatch = tradeDataText.match(/\{[\s\S]*\}/);
      tradeData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    }

    // Deduct credit using service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );
    
    await supabaseAdmin
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - VOICE_PARSE_COST })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ 
        transcript, 
        tradeData,
        creditsRemaining: profile.ai_credits - VOICE_PARSE_COST 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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