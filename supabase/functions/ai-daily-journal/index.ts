import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    // Get last 30 days of trades grouped by date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ summaries: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group trades by date
    const tradesByDate = trades.reduce((acc: any, trade: any) => {
      const date = trade.created_at.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(trade);
      return acc;
    }, {});

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const summaries = [];

    for (const [date, dayTrades] of Object.entries(tradesByDate)) {
      const typedTrades = dayTrades as any[];
      const wins = typedTrades.filter(t => t.result === 'win').length;
      const losses = typedTrades.filter(t => t.result === 'loss').length;
      const winRate = typedTrades.length > 0 ? Math.round((wins / typedTrades.length) * 100) : 0;
      const pnl = typedTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);

      let aiInsights = null;
      if (lovableApiKey) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{
                role: 'system',
                content: 'You are a trading coach analyzing a day of trading. Be direct, honest, and supportive. No asterisks or formatting.'
              }, {
                role: 'user',
                content: `Analyze this trading day:
Date: ${date}
Trades: ${typedTrades.length}
Wins: ${wins}, Losses: ${losses}
Win Rate: ${winRate}%
P/L: ${pnl.toFixed(2)}

Give me:
1. Emotional state (one word: calm/stressed/overconfident/fearful/disciplined/reckless)
2. Three key insights about this day's performance
3. Three specific recommendations for tomorrow
4. Trading quality score (0-10)

Format as JSON:
{
  "emotionalState": "word",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "tradingQuality": number
}`
              }]
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || '';
            
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiInsights = JSON.parse(jsonMatch[0]);
              }
            } catch (e) {
              console.error('Failed to parse AI JSON:', e);
            }
          }
        } catch (error) {
          console.error('AI call failed:', error);
        }
      }

      summaries.push({
        date,
        totalTrades: typedTrades.length,
        winRate,
        pnl: Number(pnl.toFixed(2)),
        emotionalState: aiInsights?.emotionalState || 'neutral',
        keyInsights: aiInsights?.keyInsights || [
          `Executed ${typedTrades.length} trades with ${winRate}% win rate`,
          pnl > 0 ? 'Profitable day' : 'Challenging day that required discipline',
          'Continue following your trading plan'
        ],
        recommendations: aiInsights?.recommendations || [
          'Review trade entries for optimal timing',
          'Maintain consistent risk management',
          'Focus on high-probability setups'
        ],
        tradingQuality: aiInsights?.tradingQuality || (winRate >= 50 ? 7 : 5)
      });
    }

    return new Response(JSON.stringify({ summaries }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-daily-journal:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
