import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Check cache - trade analysis can be cached permanently since trade data doesn't change
async function checkCache(supabase: any, tradeId: string): Promise<string | null> {
  try {
    const cacheKey = `trade_analysis_${tradeId}`;
    const { data } = await supabase
      .from("ai_response_cache")
      .select("response")
      .eq("cache_key", cacheKey)
      .single();
    return data?.response?.feedback || null;
  } catch {
    return null;
  }
}

// Store cache permanently for trade analysis
async function storeCache(supabase: any, tradeId: string, feedback: string): Promise<void> {
  try {
    const cacheKey = `trade_analysis_${tradeId}`;
    // Cache for 30 days since trade data is immutable
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("ai_response_cache")
      .upsert({ cache_key: cacheKey, response: { feedback }, expires_at: expiresAt }, { onConflict: "cache_key" });
  } catch (error) {
    console.error("Cache error:", error);
  }
}

// Call Gemini with retry
async function callGemini(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const contents = [
    { role: "user", parts: [{ text: `Instructions: ${systemPrompt}` }] },
    { role: "model", parts: [{ text: "Ready to analyze." }] },
    { role: "user", parts: [{ text: prompt }] },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
          }),
        }
      );

      if (response.status === 429) {
        const wait = Math.pow(2, attempt) * 10000;
        console.log(`Rate limited, waiting ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!response.ok) throw new Error(`Gemini: ${response.status}`);

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt < 2) await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error("Gemini unavailable");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check daily limit
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_tier, daily_ai_requests, last_ai_reset_date')
      .eq('id', user.id)
      .single();

    const today = new Date().toISOString().split('T')[0];
    let dailyRequests = profile?.daily_ai_requests || 0;
    if (profile?.last_ai_reset_date !== today) dailyRequests = 0;

    const isPremium = ['pro', 'lifetime', 'monthly'].includes(profile?.subscription_tier || 'free');
    const dailyLimit = isPremium ? 100 : 10;

    if (dailyRequests >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: 'Daily AI limit reached',
        message: 'Try again tomorrow or upgrade for more!'
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tradeId } = await req.json();
    
    if (!tradeId) {
      return new Response(JSON.stringify({ error: 'Trade ID required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache first - trade analysis is permanent
    const cachedFeedback = await checkCache(serviceClient, tradeId);
    if (cachedFeedback) {
      console.log("Returning cached trade analysis");
      return new Response(JSON.stringify({ 
        feedback: cachedFeedback,
        cached: true,
        daily_requests_remaining: dailyLimit - dailyRequests
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch trade
    const { data: trade, error: tradeError } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .single();

    if (tradeError || !trade) {
      return new Response(JSON.stringify({ error: 'Trade not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ 
        feedback: generateFallbackFeedback(trade),
        offline: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Analyze this trade briefly (2-3 sentences):
- Pair: ${trade.pair}, Direction: ${trade.direction}
- Entry: ${trade.entry_price}, SL: ${trade.stop_loss || 'Not set'}, TP: ${trade.take_profit || 'Not set'}
- Exit: ${trade.exit_price || 'Open'}, Result: ${trade.result || 'Pending'}
- Emotion Before: ${trade.emotion_before || 'N/A'}, After: ${trade.emotion_after || 'N/A'}
- Notes: ${trade.notes || 'None'}

Give specific feedback on entry, risk management, and emotions.`;

    let feedback: string;
    try {
      feedback = await callGemini(prompt, "You are a Forex trading coach. Be concise and actionable.", geminiKey);
    } catch (error) {
      console.error("Gemini failed:", error);
      feedback = generateFallbackFeedback(trade);
    }

    // Cache permanently
    await storeCache(serviceClient, tradeId, feedback);

    // Update daily usage
    await serviceClient
      .from('profiles')
      .update({ daily_ai_requests: dailyRequests + 1, last_ai_reset_date: today })
      .eq('id', user.id);

    return new Response(JSON.stringify({ 
      feedback,
      daily_requests_remaining: dailyLimit - dailyRequests - 1
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-trade:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackFeedback(trade: any): string {
  const hasStopLoss = !!trade.stop_loss;
  const hasTakeProfit = !!trade.take_profit;
  const isWin = trade.result === 'win';

  if (!hasStopLoss) {
    return "Always set a stop loss before entering. Risk management is key to longevity.";
  }
  if (isWin) {
    return "Nice win! Review what made this setup work and look for similar patterns.";
  }
  return "Every loss is a lesson. Check if your entry timing and risk placement aligned with your plan.";
}
