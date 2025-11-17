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

    // Get last 7 days of trades
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: weekTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Get previous week for comparison
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: prevWeekTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString());

    if (!weekTrades || weekTrades.length === 0) {
      return new Response(JSON.stringify({
        summary: 'No trading activity this week. Connect your MT5 account for automated insights.',
        stats: null,
        insights: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate comprehensive stats
    const stats = calculateWeekStats(weekTrades, prevWeekTrades || []);

    // Get AI behavior analysis
    const behaviorResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-behavior-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ period: 'week' }),
    });

    let behaviorAnalysis: any = null;
    if (behaviorResponse.ok) {
      const behaviorData = await behaviorResponse.json();
      behaviorAnalysis = behaviorData.analysis;
    }

    // Generate AI summary using Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    let aiSummary = '';

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
              role: 'user',
              content: `Generate a comprehensive weekly trading summary based on this data:

TRADING STATS:
- Total Trades: ${stats.totalTrades} (Previous week: ${stats.prevWeekTrades})
- Win Rate: ${stats.winRate}% (Previous: ${stats.prevWeekWinRate}%)
- Profit Factor: ${stats.profitFactor}
- Total P/L: $${stats.totalPnL}
- Average R-Multiple: ${stats.avgR}R
- Max Drawdown: ${stats.maxDrawdown}%
- Best Setup: ${stats.bestSetup.name} (${stats.bestSetup.winRate}% win rate)
- Worst Setup: ${stats.worstSetup.name} (${stats.worstSetup.winRate}% win rate)
- Most Traded Session: ${stats.mostTradedSession}
- Best Session: ${stats.bestSession} (${stats.bestSessionWinRate}% win rate)
- Consistency Score: ${stats.consistencyScore}/100

BEHAVIOR PATTERNS:
${behaviorAnalysis ? JSON.stringify(behaviorAnalysis.behaviorWarnings, null, 2) : 'No behavioral warnings'}

EMOTIONAL STATE: ${behaviorAnalysis?.emotionalState || 'Neutral'}

Provide:
1. A 2-3 sentence recap of the week (strengths & weaknesses)
2. Top 3 key mistakes or missed opportunities
3. Risk management rating (0-10) with brief explanation
4. 3 specific recommendations for next week

Keep it concise, actionable, and motivating.`
            }],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSummary = aiData.choices?.[0]?.message?.content || 'Summary generation in progress...';
        }
      } catch (aiError) {
        console.error('AI summary error:', aiError);
        aiSummary = 'AI summary temporarily unavailable. Check back soon.';
      }
    }

    return new Response(JSON.stringify({
      summary: aiSummary,
      stats,
      behaviorAnalysis,
      insights: {
        strengths: identifyStrengths(stats),
        weaknesses: identifyWeaknesses(stats),
        opportunities: identifyOpportunities(stats, behaviorAnalysis)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Weekly summary error:', error);
    return new Response(JSON.stringify({ error: 'Summary generation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateWeekStats(weekTrades: any[], prevWeekTrades: any[]) {
  const wins = weekTrades.filter(t => t.result === 'win').length;
  const losses = weekTrades.filter(t => t.result === 'loss').length;
  const winRate = weekTrades.length > 0 ? (wins / weekTrades.length) * 100 : 0;

  const prevWins = prevWeekTrades.filter(t => t.result === 'win').length;
  const prevWinRate = prevWeekTrades.length > 0 ? (prevWins / prevWeekTrades.length) * 100 : 0;

  const totalWin = weekTrades.filter(t => t.result === 'win').reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const totalLoss = Math.abs(weekTrades.filter(t => t.result === 'loss').reduce((sum, t) => sum + (t.profit_loss || 0), 0));
  const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : '0';

  const totalPnL = weekTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const avgR = weekTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / Math.max(1, weekTrades.length);

  // Calculate max drawdown
  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  weekTrades.forEach(t => {
    equity += t.profit_loss || 0;
    peak = Math.max(peak, equity);
    const dd = peak - equity;
    maxDrawdown = Math.max(maxDrawdown, dd);
  });
  const maxDrawdownPercent = peak > 0 ? ((maxDrawdown / peak) * 100).toFixed(1) : '0';

  // Setup analysis
  const setups: any = {};
  weekTrades.forEach(t => {
    const setupId = t.setup_id || 'manual';
    if (!setups[setupId]) {
      setups[setupId] = { wins: 0, total: 0, pnl: 0, name: setupId };
    }
    setups[setupId].total++;
    if (t.result === 'win') setups[setupId].wins++;
    setups[setupId].pnl += t.profit_loss || 0;
  });

  const setupsArray = Object.values(setups).map((s: any) => ({
    ...s,
    winRate: (s.wins / s.total) * 100
  }));
  
  const bestSetup = setupsArray.sort((a, b) => b.pnl - a.pnl)[0] || { name: 'N/A', winRate: 0 };
  const worstSetup = setupsArray.sort((a, b) => a.pnl - b.pnl)[0] || { name: 'N/A', winRate: 0 };

  // Session analysis
  const sessions: any = {};
  weekTrades.forEach(t => {
    const session = t.session || 'unknown';
    if (!sessions[session]) {
      sessions[session] = { wins: 0, total: 0 };
    }
    sessions[session].total++;
    if (t.result === 'win') sessions[session].wins++;
  });

  const sessionsArray = Object.entries(sessions).map(([name, data]: [string, any]) => ({
    name,
    total: data.total,
    winRate: (data.wins / data.total) * 100
  }));

  const mostTradedSession = sessionsArray.sort((a, b) => b.total - a.total)[0]?.name || 'N/A';
  const bestSession = sessionsArray.sort((a, b) => b.winRate - a.winRate)[0] || { name: 'N/A', winRate: 0 };

  // Consistency score (based on lot size and timing consistency)
  const volumes = weekTrades.map(t => t.volume || 0).filter(v => v > 0);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / Math.max(1, volumes.length);
  const volumeVariance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / Math.max(1, volumes.length);
  const volumeStdDev = Math.sqrt(volumeVariance);
  const consistencyScore = Math.max(0, Math.min(100, 100 - (volumeStdDev / avgVolume) * 100));

  return {
    totalTrades: weekTrades.length,
    prevWeekTrades: prevWeekTrades.length,
    wins,
    losses,
    winRate: winRate.toFixed(1),
    prevWeekWinRate: prevWinRate.toFixed(1),
    profitFactor,
    totalPnL: totalPnL.toFixed(2),
    avgR: avgR.toFixed(2),
    maxDrawdown: maxDrawdownPercent,
    bestSetup: { name: bestSetup.name, winRate: bestSetup.winRate.toFixed(1) },
    worstSetup: { name: worstSetup.name, winRate: worstSetup.winRate.toFixed(1) },
    mostTradedSession,
    bestSession: bestSession.name,
    bestSessionWinRate: bestSession.winRate.toFixed(1),
    consistencyScore: Math.round(consistencyScore),
    avgTradeDuration: calculateAvgDuration(weekTrades)
  };
}

function calculateAvgDuration(trades: any[]): string {
  const durations = trades
    .filter(t => t.open_time && t.close_time)
    .map(t => new Date(t.close_time!).getTime() - new Date(t.open_time!).getTime());

  if (durations.length === 0) return 'N/A';

  const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
  const hours = Math.floor(avgMs / (1000 * 60 * 60));
  const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

function identifyStrengths(stats: any): string[] {
  const strengths = [];
  
  if (parseFloat(stats.winRate) > 55) {
    strengths.push(`Strong ${stats.winRate}% win rate`);
  }
  
  if (parseFloat(stats.profitFactor) > 1.5) {
    strengths.push(`Excellent profit factor of ${stats.profitFactor}`);
  }
  
  if (stats.consistencyScore > 75) {
    strengths.push('High trading consistency maintained');
  }
  
  if (parseFloat(stats.maxDrawdown) < 5) {
    strengths.push('Excellent risk management with low drawdown');
  }

  if (strengths.length === 0) {
    strengths.push('Maintained trading activity this week');
  }

  return strengths;
}

function identifyWeaknesses(stats: any): string[] {
  const weaknesses = [];
  
  if (parseFloat(stats.winRate) < 45) {
    weaknesses.push(`Low win rate of ${stats.winRate}%`);
  }
  
  if (parseFloat(stats.profitFactor) < 1) {
    weaknesses.push('Profit factor below 1 - losses exceeding wins');
  }
  
  if (parseFloat(stats.maxDrawdown) > 15) {
    weaknesses.push('High drawdown exposure - review risk management');
  }
  
  if (stats.totalTrades > 50) {
    weaknesses.push('Possible overtrading - consider quality over quantity');
  }

  if (stats.consistencyScore < 50) {
    weaknesses.push('Inconsistent lot sizing or trade timing');
  }

  if (weaknesses.length === 0) {
    weaknesses.push('No major weaknesses detected - keep up the good work');
  }

  return weaknesses;
}

function identifyOpportunities(stats: any, behaviorAnalysis: any): string[] {
  const opportunities = [];
  
  if (parseFloat(stats.bestSetup.winRate) > 60) {
    opportunities.push(`Focus more on ${stats.bestSetup.name} setup (${stats.bestSetup.winRate}% win rate)`);
  }
  
  if (parseFloat(stats.bestSessionWinRate) > 60) {
    opportunities.push(`Consider trading more during ${stats.bestSession} session`);
  }
  
  if (parseFloat(stats.worstSetup.winRate) < 40 && stats.worstSetup.name !== 'N/A') {
    opportunities.push(`Avoid or refine ${stats.worstSetup.name} setup`);
  }

  if (behaviorAnalysis?.recommendations?.length > 0) {
    opportunities.push(...behaviorAnalysis.recommendations.slice(0, 2));
  }

  if (opportunities.length === 0) {
    opportunities.push('Continue following your trading plan');
    opportunities.push('Focus on process over profits');
  }

  return opportunities.slice(0, 3);
}
