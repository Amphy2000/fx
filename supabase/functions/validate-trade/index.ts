import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALIDATION_CREDIT_COST = 2;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check AI credits
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();

    if (!profile || profile.ai_credits < VALIDATION_CREDIT_COST) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient AI credits',
          credits_required: VALIDATION_CREDIT_COST,
          credits_available: profile?.ai_credits || 0
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { proposedTrade } = await req.json();
    const { pair, direction, emotion_before, session, volume } = proposedTrade;

    // Query last 90 days of similar trades
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: similarTrades } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('pair', pair)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .not('result', 'is', null);

    // Calculate win rate and patterns
    const totalTrades = similarTrades?.length || 0;
    const winningTrades = similarTrades?.filter(t => t.result === 'win').length || 0;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const recentTrades = similarTrades?.slice(-5) || [];

    // Find specific patterns
    let patternMatched = '';
    let riskScore = 50; // Default medium risk

    if (totalTrades < 5) {
      patternMatched = `Limited data for ${pair}. Only ${totalTrades} similar trades found.`;
      riskScore = 40;
    } else {
      // Check emotional pattern
      const emotionalTrades = similarTrades?.filter(t => 
        t.emotion_before === emotion_before && t.result === 'loss'
      ) || [];
      
      if (emotionalTrades.length > 0 && emotion_before) {
        const emotionalLossRate = (emotionalTrades.length / totalTrades) * 100;
        if (emotionalLossRate > 40) {
          patternMatched = `You often struggle with ${pair} when feeling "${emotion_before}". ${emotionalTrades.length} out of ${totalTrades} trades with this emotion resulted in losses.`;
          riskScore = Math.max(20, riskScore - 30);
        }
      }

      // Check session pattern
      if (session) {
        const sessionTrades = similarTrades?.filter(t => t.session === session) || [];
        const sessionWins = sessionTrades.filter(t => t.result === 'win').length;
        const sessionWinRate = sessionTrades.length > 0 ? (sessionWins / sessionTrades.length) * 100 : 0;
        
        if (sessionTrades.length >= 3 && sessionWinRate < 40) {
          patternMatched = patternMatched || `Your win rate for ${pair} during ${session} session is ${sessionWinRate.toFixed(0)}%. You've won ${sessionWins} out of ${sessionTrades.length} trades in this setup.`;
          riskScore = Math.max(15, riskScore - 25);
        }
      }

      // Check recent losing streak
      const recentLosses = recentTrades.filter(t => t.result === 'loss').length;
      if (recentLosses >= 3) {
        patternMatched = patternMatched || `You've lost ${recentLosses} out of your last ${recentTrades.length} trades on ${pair}. Consider taking a break.`;
        riskScore = Math.max(10, riskScore - 35);
      }

      // If no negative patterns, use overall win rate
      if (!patternMatched) {
        if (winRate >= 60) {
          patternMatched = `Good setup! Your historical win rate for ${pair} is ${winRate.toFixed(0)}%.`;
          riskScore = 75;
        } else if (winRate >= 40) {
          patternMatched = `Moderate setup. Your win rate for ${pair} is ${winRate.toFixed(0)}%.`;
          riskScore = 50;
        } else {
          patternMatched = `Caution advised. Your win rate for ${pair} is only ${winRate.toFixed(0)}%.`;
          riskScore = 30;
        }
      }
    }

    // Determine suggested action
    let suggestedAction = '';
    if (riskScore >= 60) {
      suggestedAction = 'PROCEED - This setup aligns with your winning patterns';
    } else if (riskScore >= 40) {
      suggestedAction = 'CAUTION - Review your risk management before proceeding';
    } else {
      suggestedAction = 'STOP - High risk of repeating past mistakes. Consider skipping this trade.';
    }

    // Use AI for deeper insight (only if we have enough data)
    let aiInsight = '';
    if (totalTrades >= 5) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      const aiPrompt = `Analyze this trading pattern:
- Pair: ${pair}
- Direction: ${direction}
- Emotion: ${emotion_before || 'Not specified'}
- Session: ${session || 'Not specified'}
- Historical trades: ${totalTrades}
- Win rate: ${winRate.toFixed(0)}%
- Recent performance: ${recentTrades.length} trades, pattern detected: ${patternMatched}

Provide a single, concise insight (max 2 sentences) about whether the trader should proceed with this trade.`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a trading psychology coach. Provide brief, actionable insights.' },
              { role: 'user', content: aiPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiInsight = aiData.choices[0]?.message?.content || '';
        }
      } catch (error) {
        console.error('AI insight generation failed:', error);
      }
    }

    // Deduct credits
    await supabaseClient
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - VALIDATION_CREDIT_COST })
      .eq('id', user.id);

    // Log the interception
    const { data: interception } = await supabaseClient
      .from('trade_interceptions')
      .insert({
        user_id: user.id,
        proposed_trade: proposedTrade,
        risk_score: riskScore,
        pattern_matched: patternMatched,
        similar_trades_count: totalTrades,
        win_rate: winRate,
        suggested_action: suggestedAction,
        user_action: 'pending'
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        interception_id: interception.id,
        risk_score: riskScore,
        pattern_matched: patternMatched,
        suggested_action: suggestedAction,
        similar_trades_count: totalTrades,
        win_rate: winRate.toFixed(1),
        ai_insight: aiInsight,
        credits_remaining: profile.ai_credits - VALIDATION_CREDIT_COST
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-trade function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
