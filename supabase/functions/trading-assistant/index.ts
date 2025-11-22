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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits (cost: 5 credits per message)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();
      
    const MESSAGE_COST = 5;
    if (!profile || profile.ai_credits < MESSAGE_COST) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits',
        required: MESSAGE_COST,
        available: profile?.ai_credits || 0
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, imageUrl } = await req.json();
    
    // Get user trading stats for context
    const { data: trades } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: patterns } = await supabaseClient
      .from('trade_patterns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const stats = calculateStats(trades || []);
    
    const systemPrompt = `You are an expert forex trading assistant for a trader with the following profile:

TRADING STATISTICS:
- Total trades: ${stats.totalTrades}
- Win rate: ${stats.winRate}%
- Average R-multiple: ${stats.avgR}
- Best performing pair: ${stats.bestPair}

KNOWN PATTERNS:
${patterns?.map(p => `- ${p.pattern_description} (${p.win_rate}% win rate)`).join('\n') || 'No patterns identified yet'}

BEHAVIORAL ISSUES:
${stats.behaviors.join('\n') || '- No major issues detected'}

When analyzing charts:
1. Check trend direction (higher highs/lows for uptrend)
2. Identify support/resistance levels
3. Look for confluence (multiple factors aligning)
4. Calculate risk/reward ratio (minimum 1:2)
5. Check if setup matches their winning patterns

Always enforce:
- Risk no more than 2% per trade
- Minimum 1:2 risk/reward ratio
- Trade only during high-liquidity sessions
- Take breaks after 2 consecutive losses

Be direct, concise, and actionable. If a trade looks good, say so. If not, explain why clearly.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare messages
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    // If image provided, add it to the last message
    if (imageUrl && aiMessages.length > 0) {
      const lastMessage = aiMessages[aiMessages.length - 1];
      if (lastMessage.role === 'user') {
        lastMessage.content = [
          { type: "text", text: lastMessage.content },
          { type: "image_url", image_url: { url: imageUrl } }
        ];
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    // Deduct credits (do it before streaming starts)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabaseAdmin
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - MESSAGE_COST })
      .eq('id', user.id);

    // Stream response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error in trading-assistant:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function calculateStats(trades: any[]) {
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.result === 'win').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : 0;
  
  const rMultiples = trades.filter(t => t.r_multiple).map(t => t.r_multiple);
  const avgR = rMultiples.length > 0 
    ? (rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2)
    : 'N/A';

  const pairPerformance: any = {};
  trades.forEach(t => {
    if (!pairPerformance[t.pair]) pairPerformance[t.pair] = { wins: 0, total: 0 };
    pairPerformance[t.pair].total++;
    if (t.result === 'win') pairPerformance[t.pair].wins++;
  });

  const bestPair = Object.entries(pairPerformance)
    .map(([pair, stats]: [string, any]) => ({ 
      pair, 
      winRate: stats.total > 0 ? stats.wins / stats.total : 0 
    }))
    .sort((a, b) => b.winRate - a.winRate)[0]?.pair || 'N/A';

  return {
    totalTrades,
    winRate,
    avgR,
    bestPair,
    behaviors: [] // Would be populated from trading_behaviors table
  };
}
