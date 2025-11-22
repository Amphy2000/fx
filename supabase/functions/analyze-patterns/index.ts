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
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        details: authError.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!user) {
      console.error('No user found from token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log('User authenticated:', user.id);

    // Check credits (cost: 15 credits) - use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();
      
    console.log('Profile data:', profile, 'Error:', profileError);
      
    const ANALYSIS_COST = 15;
    if (!profile || profile.ai_credits < ANALYSIS_COST) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits',
        required: ANALYSIS_COST,
        available: profile?.ai_credits || 0
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch trades (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: trades } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (!trades || trades.length < 5) {
      return new Response(JSON.stringify({ 
        error: 'Not enough trade data. Need at least 5 trades.',
        trades_count: trades?.length || 0
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare aggregated data for AI
    const pairPerformance = aggregateByPair(trades);
    const timePerformance = aggregateByTime(trades);
    const sessionPerformance = aggregateBySession(trades);

    const prompt = `Analyze this forex trader's patterns from ${trades.length} trades:

PAIR PERFORMANCE:
${JSON.stringify(pairPerformance, null, 2)}

TIME PATTERNS:
${JSON.stringify(timePerformance, null, 2)}

SESSION PATTERNS:
${JSON.stringify(sessionPerformance, null, 2)}

Identify the top 5 most important patterns. For each pattern provide:
- Pattern type (pair_based, time_based, session_based)
- Description
- Win rate
- Sample size
- Confidence score (0-100)
- Specific recommendations`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a forex trading pattern analyst. Provide actionable insights." },
          { role: "user", content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "identify_patterns",
            description: "Identify trading patterns",
            parameters: {
              type: "object",
              properties: {
                patterns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      pattern_type: { type: "string" },
                      description: { type: "string" },
                      win_rate: { type: "number" },
                      sample_size: { type: "integer" },
                      confidence_score: { type: "number" },
                      recommendations: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "identify_patterns" } }
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

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const patterns = toolCall ? JSON.parse(toolCall.function.arguments).patterns : [];
    
    // Store patterns in database (reuse admin client)
    for (const pattern of patterns) {
      await supabaseAdmin.from('trade_patterns').insert({
        user_id: user.id,
        pattern_type: pattern.pattern_type,
        pattern_description: pattern.description,
        win_rate: pattern.win_rate,
        sample_size: pattern.sample_size,
        confidence_score: pattern.confidence_score,
        recommendations: pattern.recommendations
      });
    }

    // Deduct credits
    await supabaseAdmin
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - ANALYSIS_COST })
      .eq('id', user.id);

    return new Response(JSON.stringify({ 
      patterns,
      trades_analyzed: trades.length,
      credits_remaining: profile.ai_credits - ANALYSIS_COST
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-patterns:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function aggregateByPair(trades: any[]) {
  const pairStats: any = {};
  trades.forEach(trade => {
    if (!pairStats[trade.pair]) {
      pairStats[trade.pair] = { total: 0, wins: 0, losses: 0, pnl: 0 };
    }
    pairStats[trade.pair].total++;
    if (trade.result === 'win') pairStats[trade.pair].wins++;
    if (trade.result === 'loss') pairStats[trade.pair].losses++;
    pairStats[trade.pair].pnl += trade.profit_loss || 0;
  });
  
  return Object.entries(pairStats).map(([pair, stats]: [string, any]) => ({
    pair,
    win_rate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0,
    total_trades: stats.total,
    total_pnl: stats.pnl.toFixed(2)
  }));
}

function aggregateByTime(trades: any[]) {
  const dayOfWeek: any = {};
  trades.forEach(trade => {
    const day = new Date(trade.created_at).toLocaleDateString('en-US', { weekday: 'long' });
    if (!dayOfWeek[day]) dayOfWeek[day] = { total: 0, wins: 0 };
    dayOfWeek[day].total++;
    if (trade.result === 'win') dayOfWeek[day].wins++;
  });
  
  return Object.entries(dayOfWeek).map(([day, stats]: [string, any]) => ({
    day,
    win_rate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0,
    total_trades: stats.total
  }));
}

function aggregateBySession(trades: any[]) {
  const sessions = ['Asian', 'London', 'New York'];
  const sessionStats: any = {};
  
  trades.forEach(trade => {
    const hour = new Date(trade.created_at).getUTCHours();
    let session = 'Asian';
    if (hour >= 7 && hour < 16) session = 'London';
    else if (hour >= 13 && hour < 22) session = 'New York';
    
    if (!sessionStats[session]) sessionStats[session] = { total: 0, wins: 0 };
    sessionStats[session].total++;
    if (trade.result === 'win') sessionStats[session].wins++;
  });
  
  return Object.entries(sessionStats).map(([session, stats]: [string, any]) => ({
    session,
    win_rate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0,
    total_trades: stats.total
  }));
}
