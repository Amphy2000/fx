import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { callGemini, generateFallbackResponse } from "../_shared/gemini-client.ts";

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

    // Get user's subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(profile.subscription_tier);

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

    const summaries = [];

    for (const [date, dayTrades] of Object.entries(tradesByDate)) {
      const typedTrades = dayTrades as any[];
      const wins = typedTrades.filter(t => t.result === 'win').length;
      const losses = typedTrades.filter(t => t.result === 'loss').length;
      const winRate = typedTrades.length > 0 ? Math.round((wins / typedTrades.length) * 100) : 0;
      const pnl = typedTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);

      let aiInsights = null;
      try {
        const result = await callGemini({
          supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
          supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          userId: user.id,
          prompt: `Analyze this trading day:
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
}`,
          systemPrompt: 'You are a trading coach analyzing a day of trading. Be direct, honest, and supportive. Return ONLY valid JSON.',
          cacheKey: `journal-${date}-${winRate}`,
          cacheTtlMinutes: 1440, // 24 hours
          skipUsageCheck: isPremium,
        });

        try {
          const jsonMatch = result.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiInsights = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Failed to parse AI JSON:', e);
        }
      } catch (error) {
        console.error('Gemini call failed:', error);
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
