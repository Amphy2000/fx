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

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    // Create authenticated client with user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits (cost: 5 credits per message)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch user profile',
        details: profileError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
      
    const MESSAGE_COST = 5;
    console.log('User credits check:', { userId: user.id, credits: profile?.ai_credits, required: MESSAGE_COST });
    
    if (!profile || profile.ai_credits < MESSAGE_COST) {
      console.log('Insufficient credits:', { available: profile?.ai_credits || 0, required: MESSAGE_COST });
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
    
    const systemPrompt = `You're a forex trading buddy helping a fellow trader. Chat naturally and keep it real.

Here's what I know about your trading:
- You've taken ${stats.totalTrades} trades with a ${stats.winRate}% win rate
- Your average R is ${stats.avgR}
- ${stats.bestPair} is your best pair
${patterns?.length ? `\nYou tend to do well when: ${patterns.map(p => p.pattern_description).join(', ')}` : ''}

When they send a chart or ask about a setup:
- Look at it like you would your own trade
- Keep responses short and conversational (2-3 sentences max)
- Speak like a trader, not a textbook - use "I see...", "Looks like...", "I'd wait for..."
- Only point out the most important thing - don't list everything
- If it's good, say "I like this" and why. If not, say "I'd skip this" and the main reason
- Be honest but supportive

Risk reminders (mention casually when relevant):
- 2% risk per trade
- 1:2 minimum R:R
- High liquidity sessions only
- Break after 2 losses

Talk like you're texting a trading friend, not writing a report.`;

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
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
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
      return new Response(JSON.stringify({ 
        error: "AI gateway error", 
        details: errorText,
        status: response.status 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
