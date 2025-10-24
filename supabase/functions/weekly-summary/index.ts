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
        error: "Oops! Our AI is feeling sleepy 😴. Please try logging in again!" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ 
        error: "Oops! Our AI is feeling sleepy 😴. Please try logging in again!" 
      }), {
        status: 401,
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

    if (error) {
      console.error("Trade fetch error:", error);
      return new Response(JSON.stringify({ 
        error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ 
        summary: "No trades recorded this week. Start logging your trades to get AI insights!",
        stats: {
          totalTrades: 0,
          winRate: 0,
          wins: 0,
          losses: 0,
          mostTradedPair: "N/A"
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate statistics
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;
    
    const pairCounts: Record<string, number> = {};
    trades.forEach(t => {
      pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1;
    });
    const mostTradedPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const emotionCounts: Record<string, number> = {};
    trades.forEach(t => {
      if (t.emotion_before) emotionCounts[t.emotion_before] = (emotionCounts[t.emotion_before] || 0) + 1;
    });

    const totalPL = trades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0), 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Here's how this trader did this week:

This Week's Numbers:
- ${trades.length} trades (${wins} wins, ${losses} losses) = ${winRate}% win rate
- Total P/L: ${totalPL > 0 ? '+' : ''}${totalPL.toFixed(2)}
- Favorite pair: ${mostTradedPair}
- Trading emotions: ${Object.keys(emotionCounts).length > 0 ? Object.keys(emotionCounts).join(', ') : 'Not tracked'}

Their Trades This Week:
${trades.slice(0, 10).map(t => 
  `${t.pair} ${t.direction} → ${t.result || 'still open'} ${t.profit_loss ? `(${t.profit_loss > 0 ? '+' : ''}${t.profit_loss})` : ''}`
).join('\n')}

Write them a weekly recap that feels like it's from a real trading mentor. Be conversational and genuine. Start with how their week went, mention something specific they did well or a pattern you noticed, and give them one clear thing to work on next week. Make it personal and actionable, not generic. If they had a rough week, be supportive but honest. If they crushed it, celebrate with them! Keep it under 150 words.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You're an experienced trading mentor who gives real, conversational feedback. Write like you're texting a friend, not writing a formal report. Be genuine, supportive, and specific - no generic motivational fluff. Point out actual patterns in their trading and give concrete advice they can use." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
        mostTradedPair,
        totalPL
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
