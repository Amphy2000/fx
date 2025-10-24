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
      return new Response(JSON.stringify({ 
        error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ 
        error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get trades from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: trades, error } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ 
        summary: "No trades recorded this week. Start logging your trades to get AI insights!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate statistics
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;
    
    // Calculate total P/L
    const totalPL = trades.reduce((sum, t) => {
      const pl = t.profit_loss ? parseFloat(String(t.profit_loss)) : 0;
      return sum + pl;
    }, 0);
    
    const pairCounts: Record<string, number> = {};
    trades.forEach(t => {
      pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1;
    });
    const mostTradedPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const emotionCounts: Record<string, number> = {};
    trades.forEach(t => {
      if (t.emotion_before) emotionCounts[t.emotion_before] = (emotionCounts[t.emotion_before] || 0) + 1;
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a professional Forex trading analyst. Generate a weekly summary for this trader.

Statistics:
- Total Trades: ${trades.length}
- Win Rate: ${winRate}%
- Wins: ${wins}
- Losses: ${losses}
- Total P/L: $${totalPL.toFixed(2)}
- Most Traded Pair: ${mostTradedPair}
- Common Emotions: ${Object.keys(emotionCounts).join(', ')}

Recent Trades Summary:
${trades.slice(0, 10).map(t => `- ${t.pair} ${t.direction} (${t.result || 'pending'})${t.profit_loss ? ` P/L: $${t.profit_loss}` : ''}`).join('\n')}

Provide:
1. A brief performance overview (2-3 sentences)
2. One key strength they're showing
3. One area for improvement
4. One actionable tip for next week

Keep it motivating and specific.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a supportive trading coach providing weekly performance reviews." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ 
        error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      summary,
      stats: {
        totalTrades: trades.length,
        winRate,
        wins,
        losses,
        totalPL: totalPL.toFixed(2),
        mostTradedPair
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in weekly-summary function:", error);
    return new Response(JSON.stringify({ 
      error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
