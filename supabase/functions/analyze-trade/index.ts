import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits (cost: 5 credits)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('ai_credits, subscription_tier')
      .eq('id', user.id)
      .single();
      
    const ANALYSIS_COST = 5;
    if (!profile || profile.ai_credits < ANALYSIS_COST) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits',
        required: ANALYSIS_COST,
        available: profile?.ai_credits || 0,
        message: 'You need more AI credits. Upgrade to get more!'
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { trade } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are an experienced Forex trading mentor. Analyze this trade and provide brief, actionable feedback (2-3 sentences max).

Trade Details:
- Pair: ${trade.pair}
- Direction: ${trade.direction}
- Entry: ${trade.entry_price}
- Stop Loss: ${trade.stop_loss || 'Not set'}
- Take Profit: ${trade.take_profit || 'Not set'}
- Exit: ${trade.exit_price || 'Still open'}
- Result: ${trade.result || 'Pending'}
- Emotion Before: ${trade.emotion_before || 'Not recorded'}
- Emotion After: ${trade.emotion_after || 'Not recorded'}
- Notes: ${trade.notes || 'None'}

Give specific feedback on: entry timing, risk management, and emotional state. Be encouraging but honest.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional Forex trading coach providing concise, actionable feedback." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const feedback = data.choices[0].message.content;
    
    // Deduct credits
    await supabaseClient
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - ANALYSIS_COST })
      .eq('id', user.id);

    return new Response(JSON.stringify({ 
      feedback,
      credits_remaining: profile.ai_credits - ANALYSIS_COST
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-trade function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
