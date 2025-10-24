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
    const { message } = await req.json();
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

    // Get recent trades for context
    const { data: trades, error } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Trade fetch error:", error);
      return new Response(JSON.stringify({ 
        error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wins = trades?.filter(t => t.result === 'win').length || 0;
    const losses = trades?.filter(t => t.result === 'loss').length || 0;
    const totalTrades = trades?.length || 0;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

    const pairPerformance: Record<string, { wins: number, losses: number }> = {};
    trades?.forEach(t => {
      if (!pairPerformance[t.pair]) {
        pairPerformance[t.pair] = { wins: 0, losses: 0 };
      }
      if (t.result === 'win') pairPerformance[t.pair].wins++;
      if (t.result === 'loss') pairPerformance[t.pair].losses++;
    });

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

    const totalPL = trades?.reduce((sum, t) => sum + (Number(t.profit_loss) || 0), 0) || 0;

    const contextPrompt = `Here's what I know about their trading:

Stats: ${totalTrades} trades total, ${winRate}% win rate (${wins} wins, ${losses} losses)${totalPL !== 0 ? `, total P/L: ${totalPL > 0 ? '+' : ''}${totalPL.toFixed(2)}` : ''}

Pairs they're trading:
${Object.entries(pairPerformance).map(([pair, perf]) => 
  `${pair}: ${perf.wins} wins, ${perf.losses} losses`
).join('\n')}

Last 10 trades:
${trades?.slice(0, 10).map(t => 
  `${t.pair} ${t.direction} - ${t.result || 'open'} ${t.profit_loss ? `(${t.profit_loss > 0 ? '+' : ''}${t.profit_loss})` : ''} on ${new Date(t.created_at!).toLocaleDateString()}`
).join('\n')}

Their question: "${message}"

Give them a real, honest answer like a trading buddy would. Be conversational, supportive but real. Don't just repeat their stats back - give actual insights and advice. If they don't have enough data yet, be honest about it and suggest what they should focus on. Keep it natural and friendly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You're a friendly, experienced trading buddy who gives real talk. Be conversational and supportive, but honest. Don't just regurgitate stats - give actual insights and actionable advice. Talk like a friend who really knows trading, not a formal assistant. Use natural language, be encouraging but real about what the data shows. If there's not enough data to answer something, say so directly and tell them what to focus on instead." },
          { role: "user", content: contextPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
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
    const reply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in trade-chat function:", error);
    return new Response(JSON.stringify({ 
      error: "Oops! Our AI is feeling sleepy 😴. Please try again in a moment!" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
