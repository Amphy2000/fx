import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANALYSIS_COST = 5;

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

    const { setupId } = await req.json();
    if (!setupId) {
      return new Response(JSON.stringify({ error: 'Setup ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.ai_credits < ANALYSIS_COST) {
      return new Response(JSON.stringify({ error: 'Insufficient credits', required: ANALYSIS_COST }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch setup details
    const { data: setup } = await supabase
      .from('setups')
      .select('*')
      .eq('id', setupId)
      .eq('user_id', user.id)
      .single();

    if (!setup) {
      return new Response(JSON.stringify({ error: 'Setup not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch all trades for this setup
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('setup_id', setupId)
      .order('created_at', { ascending: true });

    if (!trades || trades.length < 5) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient data', 
        message: 'Need at least 5 trades to perform analysis' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate metrics
    const wins = trades.filter(t => t.result === 'win');
    const losses = trades.filter(t => t.result === 'loss');
    const winRate = (wins.length / trades.length) * 100;
    
    const totalWin = wins.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.profit_loss || 0), 0));
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : 0;
    
    const avgR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length;
    const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;

    // Analyze time patterns
    const timePatterns = analyzeTimePatterns(trades);
    const emotionalPatterns = analyzeEmotionalPatterns(trades);
    const executionPatterns = analyzeExecutionPatterns(trades);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare AI prompt
    const prompt = `Analyze this trading setup performance and provide actionable insights:

Setup Name: ${setup.name}
Setup Rules: ${setup.rules}
Setup Description: ${setup.description || 'N/A'}

Performance Metrics:
- Total Trades: ${trades.length}
- Win Rate: ${winRate.toFixed(1)}%
- Profit Factor: ${profitFactor.toFixed(2)}
- Average R-Multiple: ${avgR.toFixed(2)}
- Average Win: $${avgWin.toFixed(2)}
- Average Loss: $${avgLoss.toFixed(2)}

Time Patterns:
${JSON.stringify(timePatterns, null, 2)}

Emotional Patterns:
${JSON.stringify(emotionalPatterns, null, 2)}

Execution Quality:
${JSON.stringify(executionPatterns, null, 2)}

Recent Trades Summary:
${trades.slice(-10).map(t => `${t.result}: ${t.pair} ${t.direction}, P/L: $${t.profit_loss?.toFixed(2)}, R: ${t.r_multiple?.toFixed(2)}, Emotions: ${t.emotion_before} → ${t.emotion_after}`).join('\n')}

Provide a comprehensive analysis with:
1. Performance grade (A+, A, B, C, D, or F)
2. Health score (0-100)
3. Top 3 strengths
4. Top 3 weaknesses
5. Winning trade patterns
6. Losing trade patterns
7. 5 specific, actionable recommendations
8. Focus priority (high, medium, low, or pause)
9. Confidence score in the analysis (0-100)`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert trading performance analyst. Provide specific, actionable insights based on data patterns. Be direct and critical when needed.'
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_setup',
            description: 'Provide structured analysis of trading setup performance',
            parameters: {
              type: 'object',
              properties: {
                performance_grade: { 
                  type: 'string', 
                  enum: ['A+', 'A', 'B', 'C', 'D', 'F'],
                  description: 'Overall performance grade'
                },
                health_score: { 
                  type: 'number',
                  description: 'Health score from 0-100'
                },
                strengths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Top 3 strengths'
                },
                weaknesses: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Top 3 weaknesses'
                },
                winning_patterns: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    specific_patterns: { type: 'array', items: { type: 'string' } }
                  }
                },
                losing_patterns: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    specific_patterns: { type: 'array', items: { type: 'string' } }
                  }
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '5 specific actionable recommendations'
                },
                focus_priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low', 'pause'],
                  description: 'Priority level for this setup'
                },
                confidence_score: {
                  type: 'number',
                  description: 'Confidence in analysis from 0-100'
                }
              },
              required: ['performance_grade', 'health_score', 'strengths', 'weaknesses', 'recommendations', 'focus_priority', 'confidence_score']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_setup' } }
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API Error:', await aiResponse.text());
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Store insights in database
    const { error: insertError } = await supabase
      .from('setup_ai_insights')
      .insert({
        setup_id: setupId,
        user_id: user.id,
        performance_grade: analysis.performance_grade,
        health_score: analysis.health_score,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        winning_patterns: analysis.winning_patterns,
        losing_patterns: analysis.losing_patterns,
        focus_priority: analysis.focus_priority,
        confidence_score: analysis.confidence_score,
        raw_analysis: JSON.stringify(aiData)
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
    }

    // Deduct credits
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await serviceSupabase
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - ANALYSIS_COST })
      .eq('id', user.id);

    return new Response(JSON.stringify({
      ...analysis,
      metrics: {
        totalTrades: trades.length,
        winRate: winRate.toFixed(1),
        profitFactor: profitFactor.toFixed(2),
        avgR: avgR.toFixed(2)
      },
      creditsRemaining: profile.ai_credits - ANALYSIS_COST
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function analyzeTimePatterns(trades: any[]) {
  const hourCounts: Record<string, { wins: number; losses: number }> = {};
  const dayCounts: Record<string, { wins: number; losses: number }> = {};
  
  trades.forEach(trade => {
    if (trade.open_time) {
      const date = new Date(trade.open_time);
      const hour = date.getHours();
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      if (!hourCounts[hour]) hourCounts[hour] = { wins: 0, losses: 0 };
      if (!dayCounts[day]) dayCounts[day] = { wins: 0, losses: 0 };
      
      if (trade.result === 'win') {
        hourCounts[hour].wins++;
        dayCounts[day].wins++;
      } else if (trade.result === 'loss') {
        hourCounts[hour].losses++;
        dayCounts[day].losses++;
      }
    }
  });

  const bestHour = Object.entries(hourCounts)
    .map(([hour, stats]) => ({ hour, winRate: stats.wins / (stats.wins + stats.losses) }))
    .sort((a, b) => b.winRate - a.winRate)[0];

  const bestDay = Object.entries(dayCounts)
    .map(([day, stats]) => ({ day, winRate: stats.wins / (stats.wins + stats.losses) }))
    .sort((a, b) => b.winRate - a.winRate)[0];

  return { bestHour, bestDay, hourCounts, dayCounts };
}

function analyzeEmotionalPatterns(trades: any[]) {
  const emotionWinRates: Record<string, { wins: number; total: number }> = {};
  
  trades.forEach(trade => {
    if (trade.emotion_before) {
      const emotion = trade.emotion_before;
      if (!emotionWinRates[emotion]) emotionWinRates[emotion] = { wins: 0, total: 0 };
      emotionWinRates[emotion].total++;
      if (trade.result === 'win') emotionWinRates[emotion].wins++;
    }
  });

  const bestEmotion = Object.entries(emotionWinRates)
    .map(([emotion, stats]) => ({ emotion, winRate: stats.wins / stats.total }))
    .sort((a, b) => b.winRate - a.winRate)[0];

  return { emotionWinRates, bestEmotion };
}

function analyzeExecutionPatterns(trades: any[]) {
  const avgRWins = trades.filter(t => t.result === 'win').reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.filter(t => t.result === 'win').length;
  const avgRLosses = Math.abs(trades.filter(t => t.result === 'loss').reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.filter(t => t.result === 'loss').length);
  
  return {
    avgRWins: avgRWins.toFixed(2),
    avgRLosses: avgRLosses.toFixed(2),
    letWinnersRun: avgRWins > 2,
    cutLossesEarly: avgRLosses < 1.5
  };
}
