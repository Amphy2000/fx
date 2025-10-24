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

    // Get recent trades for context
    const { data: trades, error } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

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
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const contextPrompt = `You are an AI trading assistant with access to the user's trading history. Answer their question based on this data:

Trading Statistics:
- Total Trades: ${totalTrades}
- Win Rate: ${winRate}%
- Wins: ${wins}
- Losses: ${losses}

Pair Performance:
${Object.entries(pairPerformance).map(([pair, perf]) => 
  `- ${pair}: ${perf.wins}W/${perf.losses}L`
).join('\n')}

Recent Trades (last 10):
${trades?.slice(0, 10).map(t => 
  `${t.pair} ${t.direction} - ${t.result || 'pending'} (${new Date(t.created_at!).toLocaleDateString()})`
).join('\n')}

User Question: ${message}

Provide a helpful, specific answer based on their actual trading data. Keep it concise and actionable.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a knowledgeable trading assistant helping traders understand their performance data." },
          { role: "user", content: contextPrompt }
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
