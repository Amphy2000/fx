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

    const { period = 'day' } = await req.json().catch(() => ({ period: 'day' }));

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Fetch all trades for analysis
    const { data: allTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    const { data: recentTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!recentTrades || recentTrades.length === 0) {
      return new Response(JSON.stringify({ 
        analysis: {
          overtrading: { detected: false, message: 'Insufficient data for analysis' },
          revengeTrading: { detected: false, message: 'No recent activity' },
          emotionalState: 'neutral',
          behaviorWarnings: [],
          recommendations: ['Connect MT5 account for automated analysis']
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze patterns
    const analysis = analyzePatterns(recentTrades, allTrades || [], period);

    // Generate AI insights using Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
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
              content: `Analyze this trading behavior data and provide psychological insights:
              
Period: ${period}
Total Trades: ${recentTrades.length}
Detected Patterns: ${JSON.stringify(analysis, null, 2)}

Provide:
1. Emotional state assessment (calm, stressed, overconfident, fearful, disciplined)
2. 3 specific behavior warnings if any issues detected
3. 3 actionable recommendations for improvement

Keep response concise and direct.`
            }],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiInsights = aiData.choices?.[0]?.message?.content || '';
          analysis.aiInsights = aiInsights;
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Behavior analysis error:', error);
    return new Response(JSON.stringify({ error: 'Analysis failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzePatterns(recentTrades: any[], allTrades: any[], period: string) {
  const analysis: any = {
    overtrading: { detected: false, severity: 0, message: '' },
    revengeTrading: { detected: false, instances: [], message: '' },
    emotionalState: 'neutral',
    behaviorWarnings: [],
    recommendations: [],
    patterns: {}
  };

  // Calculate average trades per day from historical data
  const avgTradesPerDay = calculateAvgTradesPerDay(allTrades);
  const currentTradesPerDay = recentTrades.length / (period === 'day' ? 1 : period === 'week' ? 7 : 30);

  // Overtrading detection
  if (currentTradesPerDay > avgTradesPerDay * 1.5 && recentTrades.length > 10) {
    analysis.overtrading.detected = true;
    analysis.overtrading.severity = Math.min(10, Math.round((currentTradesPerDay / avgTradesPerDay) * 5));
    analysis.overtrading.message = `You opened ${recentTrades.length} trades in ${period}, which is ${Math.round(((currentTradesPerDay / avgTradesPerDay) - 1) * 100)}% above your normal trading frequency`;
    analysis.behaviorWarnings.push(`⚠️ Overtrading detected: ${recentTrades.length} trades this ${period}`);
  }

  // Revenge trading detection (quick consecutive losses followed by increased lot size)
  const revengeTrades = detectRevengeTrades(recentTrades);
  if (revengeTrades.length > 0) {
    analysis.revengeTrading.detected = true;
    analysis.revengeTrading.instances = revengeTrades;
    analysis.revengeTrading.message = `Detected ${revengeTrades.length} potential revenge trading instances`;
    analysis.behaviorWarnings.push(`🔥 Revenge trading detected: ${revengeTrades.length} instances after losses`);
  }

  // Time-of-day behavior shifts
  const timePatterns = analyzeTimePatterns(recentTrades);
  if (timePatterns.worstSession) {
    analysis.patterns.timeOfDay = timePatterns;
    if (timePatterns.worstSession.winRate < 40) {
      analysis.behaviorWarnings.push(`⏰ Poor performance during ${timePatterns.worstSession.session} session (${timePatterns.worstSession.winRate}% win rate)`);
      analysis.recommendations.push(`Consider avoiding ${timePatterns.worstSession.session} session or reducing position size`);
    }
  }

  // Lot size drift detection
  const lotDrift = detectLotSizeDrift(allTrades, recentTrades);
  if (lotDrift.drifting) {
    analysis.patterns.lotSizeDrift = lotDrift;
    analysis.behaviorWarnings.push(`📊 Lot size increased by ${lotDrift.percentageChange}% - review risk management`);
    analysis.recommendations.push('Return to your planned lot size and stick to risk management rules');
  }

  // Drawdown stress detection
  const drawdownStress = detectDrawdownStress(recentTrades);
  if (drawdownStress.stressed) {
    analysis.emotionalState = 'stressed';
    analysis.behaviorWarnings.push(`📉 Currently in ${drawdownStress.drawdownPercent}% drawdown - high stress period`);
    analysis.recommendations.push('Consider taking a break or reducing position size during drawdown periods');
  }

  // Emotional consistency
  const consistency = calculateConsistency(recentTrades);
  analysis.patterns.consistency = consistency;
  
  if (consistency.score < 60) {
    analysis.emotionalState = 'inconsistent';
    analysis.recommendations.push('Focus on following your trading plan consistently');
  } else if (consistency.score > 80) {
    analysis.emotionalState = 'disciplined';
  }

  // Add positive recommendations if trading well
  if (analysis.behaviorWarnings.length === 0) {
    analysis.recommendations.push('Keep maintaining your disciplined approach');
    analysis.recommendations.push('Continue following your trading plan');
    analysis.emotionalState = 'calm';
  }

  return analysis;
}

function calculateAvgTradesPerDay(trades: any[]): number {
  if (trades.length === 0) return 0;
  
  const firstTrade = new Date(trades[0].created_at);
  const lastTrade = new Date(trades[trades.length - 1].created_at);
  const daysDiff = Math.max(1, (lastTrade.getTime() - firstTrade.getTime()) / (1000 * 60 * 60 * 24));
  
  return trades.length / daysDiff;
}

function detectRevengeTrades(trades: any[]): any[] {
  const revengeTrades = [];
  
  for (let i = 1; i < trades.length; i++) {
    const prevTrade = trades[i - 1];
    const currentTrade = trades[i];
    
    // Check if previous was a loss
    if (prevTrade.result === 'loss') {
      const timeDiff = new Date(currentTrade.created_at).getTime() - new Date(prevTrade.created_at).getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      // Quick trade after loss (within 30 minutes) with increased lot size
      if (minutesDiff < 30 && currentTrade.volume > (prevTrade.volume || 0) * 1.2) {
        revengeTrades.push({
          tradeId: currentTrade.id,
          prevTradeId: prevTrade.id,
          minutesAfter: Math.round(minutesDiff),
          lotSizeIncrease: Math.round(((currentTrade.volume / prevTrade.volume) - 1) * 100)
        });
      }
    }
  }
  
  return revengeTrades;
}

function analyzeTimePatterns(trades: any[]): any {
  const sessions: any = {
    london: { trades: [], wins: 0, losses: 0 },
    newyork: { trades: [], wins: 0, losses: 0 },
    asian: { trades: [], wins: 0, losses: 0 }
  };

  trades.forEach(trade => {
    const session = (trade.session || 'unknown').toLowerCase();
    if (sessions[session]) {
      sessions[session].trades.push(trade);
      if (trade.result === 'win') sessions[session].wins++;
      if (trade.result === 'loss') sessions[session].losses++;
    }
  });

  let worstSession = null;
  let worstWinRate = 100;

  Object.keys(sessions).forEach(key => {
    const s = sessions[key];
    if (s.trades.length > 0) {
      const winRate = (s.wins / s.trades.length) * 100;
      if (winRate < worstWinRate) {
        worstWinRate = winRate;
        worstSession = {
          session: key,
          winRate: Math.round(winRate),
          trades: s.trades.length
        };
      }
    }
  });

  return { sessions, worstSession };
}

function detectLotSizeDrift(allTrades: any[], recentTrades: any[]): any {
  const historicalAvg = allTrades.reduce((sum, t) => sum + (t.volume || 0), 0) / Math.max(1, allTrades.length);
  const recentAvg = recentTrades.reduce((sum, t) => sum + (t.volume || 0), 0) / Math.max(1, recentTrades.length);
  
  const percentageChange = ((recentAvg / historicalAvg) - 1) * 100;
  
  return {
    drifting: percentageChange > 25,
    percentageChange: Math.round(percentageChange),
    historicalAvg: historicalAvg.toFixed(2),
    recentAvg: recentAvg.toFixed(2)
  };
}

function detectDrawdownStress(trades: any[]): any {
  let peak = 0;
  let currentEquity = 0;
  let maxDrawdown = 0;

  trades.forEach(trade => {
    currentEquity += trade.profit_loss || 0;
    peak = Math.max(peak, currentEquity);
    const drawdown = peak - currentEquity;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  const drawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

  return {
    stressed: drawdownPercent > 10,
    drawdownPercent: Math.round(drawdownPercent),
    maxDrawdown: maxDrawdown.toFixed(2)
  };
}

function calculateConsistency(trades: any[]): any {
  if (trades.length < 5) return { score: 0, message: 'Need more trades' };

  // Check lot size consistency
  const volumes = trades.map(t => t.volume || 0).filter(v => v > 0);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const volumeVariance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length;
  const volumeStdDev = Math.sqrt(volumeVariance);
  const volumeConsistency = Math.max(0, 100 - (volumeStdDev / avgVolume) * 100);

  // Check trade frequency consistency
  const timeDiffs = [];
  for (let i = 1; i < trades.length; i++) {
    const diff = new Date(trades[i].created_at).getTime() - new Date(trades[i-1].created_at).getTime();
    timeDiffs.push(diff);
  }
  const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  const timeVariance = timeDiffs.reduce((sum, d) => sum + Math.pow(d - avgTimeDiff, 2), 0) / timeDiffs.length;
  const timeConsistency = Math.max(0, 100 - (Math.sqrt(timeVariance) / avgTimeDiff) * 50);

  const overallScore = (volumeConsistency * 0.6 + timeConsistency * 0.4);

  return {
    score: Math.round(overallScore),
    volumeConsistency: Math.round(volumeConsistency),
    timeConsistency: Math.round(timeConsistency)
  };
}
