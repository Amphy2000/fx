import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Check credits (cost: 3 credits per copilot analysis)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('ai_credits, subscription_tier')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const COPILOT_COST = 3;
    if (profile.ai_credits < COPILOT_COST) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          required: COPILOT_COST,
          available: profile.ai_credits,
          message: 'You need more AI credits to use Trade Copilot!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
      );
    }

    const { pair, direction, entry_price, stop_loss, take_profit, emotion_before } = await req.json();

    // Fetch user's historical data for pattern analysis
    const { data: recentTrades } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const tradeCount = recentTrades?.length || 0;
    
    // Determine AI mode based on trade count
    let aiMode = 'general';
    let modeDescription = 'General AI Mode';
    
    if (tradeCount >= 50) {
      aiMode = 'personalized';
      modeDescription = 'Personalized AI Mode';
    } else if (tradeCount >= 10) {
      aiMode = 'hybrid';
      modeDescription = 'Hybrid AI Mode';
    }

    // Calculate risk-reward ratio
    const riskAmount = Math.abs(entry_price - stop_loss);
    const rewardAmount = Math.abs(take_profit - entry_price);
    const riskRewardRatio = (rewardAmount / riskAmount).toFixed(2);

    let prompt = '';
    let statistics: any = { riskRewardRatio, mode: modeDescription, tradeCount };

    // GENERAL AI MODE (<10 trades) - Universal trading intelligence
    if (aiMode === 'general') {
      prompt = `You are a professional forex trading copilot using universal trading principles. Analyze this PENDING trade setup for a NEW trader with only ${tradeCount} logged trades.

**Proposed Trade:**
- Pair: ${pair}
- Direction: ${direction}
- Entry: ${entry_price}
- Stop Loss: ${stop_loss}
- Take Profit: ${take_profit}
- Risk/Reward: 1:${riskRewardRatio}
- Trader's Emotion: ${emotion_before}

**Your Mission (General Trading Intelligence):**
1. **Risk Assessment** (🚦): Rate this setup (Green/Yellow/Red). Minimum acceptable R:R is 1:2
2. **Setup Quality** (📊): Evaluate entry precision, stop loss placement, and take profit target
3. **Market Context** (🌍): Consider typical volatility for ${pair} and current market session
4. **Psychological Check** (🧠): Assess if emotion "${emotion_before}" is conducive to trading
5. **Best Practices** (✅): What would experienced traders consider before entering?
6. **Action Recommendation** (✅/❌): Should they take this trade? What improvements are needed?

Focus on UNIVERSAL trading wisdom since this trader is building their foundation. Be encouraging but prioritize proper risk management.`;
    }
    // HYBRID MODE (10-49 trades) - Blend general + emerging patterns
    else if (aiMode === 'hybrid') {
      const pairHistory = recentTrades?.filter(t => t.pair === pair) || [];
      const emotionHistory = recentTrades?.filter(t => t.emotion_before === emotion_before) || [];
      const directionHistory = recentTrades?.filter(t => t.direction === direction) || [];
      
      const pairWinRate = pairHistory.length > 0 
        ? (pairHistory.filter(t => t.result === 'win').length / pairHistory.length * 100).toFixed(1)
        : 'N/A';
        
      const emotionWinRate = emotionHistory.length > 0
        ? (emotionHistory.filter(t => t.result === 'win').length / emotionHistory.length * 100).toFixed(1)
        : 'N/A';
        
      const directionWinRate = directionHistory.length > 0
        ? (directionHistory.filter(t => t.result === 'win').length / directionHistory.length * 100).toFixed(1)
        : 'N/A';

      statistics = { ...statistics, pairWinRate, emotionWinRate, directionWinRate };

      prompt = `You are a professional forex trading copilot. This trader has logged ${tradeCount} trades - enough to see EARLY PATTERNS but still building experience.

**Proposed Trade:**
- Pair: ${pair}
- Direction: ${direction}
- Entry: ${entry_price}
- Stop Loss: ${stop_loss}
- Take Profit: ${take_profit}
- Risk/Reward: 1:${riskRewardRatio}
- Trader's Emotion: ${emotion_before}

**Early Performance Indicators:**
- ${pair} trades: ${pairHistory.length} total, ${pairWinRate}% win rate
- ${direction} trades: ${directionHistory.length} total, ${directionWinRate}% win rate  
- Trading while "${emotion_before}": ${emotionHistory.length} total, ${emotionWinRate}% win rate

**Your Mission (70% General + 30% Personal):**
1. **Risk Assessment** (🚦): Rate setup quality (Green/Yellow/Red)
2. **Emerging Patterns** (🔍): Note ANY early trends in their data (even if limited)
3. **Universal Wisdom** (🎓): Apply core trading principles (proper R:R, session bias, volatility)
4. **Psychological Check** (🧠): How does their emotional state align with past performance?
5. **Growth Areas** (📈): What should they focus on as they build more data?
6. **Action Recommendation** (✅/❌): Take the trade or adjust parameters?

Balance personal insights with foundational trading knowledge. Be supportive as they develop their edge.`;
    }
    // PERSONALIZED MODE (50+ trades) - Deep personal analysis
    else {
      const pairHistory = recentTrades?.filter(t => t.pair === pair) || [];
      const emotionHistory = recentTrades?.filter(t => t.emotion_before === emotion_before) || [];
      const directionHistory = recentTrades?.filter(t => t.direction === direction) || [];
      
      const pairWinRate = pairHistory.length > 0 
        ? (pairHistory.filter(t => t.result === 'win').length / pairHistory.length * 100).toFixed(1)
        : 'N/A';
        
      const emotionWinRate = emotionHistory.length > 0
        ? (emotionHistory.filter(t => t.result === 'win').length / emotionHistory.length * 100).toFixed(1)
        : 'N/A';
        
      const directionWinRate = directionHistory.length > 0
        ? (directionHistory.filter(t => t.result === 'win').length / directionHistory.length * 100).toFixed(1)
        : 'N/A';

      statistics = { ...statistics, pairWinRate, emotionWinRate, directionWinRate };

      prompt = `You are a professional forex trading copilot analyzing a trade for an EXPERIENCED trader with ${tradeCount} logged trades. You have deep insight into their patterns.

**Proposed Trade:**
- Pair: ${pair}
- Direction: ${direction}
- Entry: ${entry_price}
- Stop Loss: ${stop_loss}
- Take Profit: ${take_profit}
- Risk/Reward: 1:${riskRewardRatio}
- Trader's Emotion: ${emotion_before}

**Trader's Historical Performance (Last 50 Trades):**
- ${pair} Win Rate: ${pairWinRate}% (${pairHistory.length} trades)
- ${direction} trades Win Rate: ${directionWinRate}% (${directionHistory.length} trades)
- Trading while "${emotion_before}" Win Rate: ${emotionWinRate}% (${emotionHistory.length} trades)

**Your Mission (70% Personal + 30% Universal):**
1. **Personal Risk Assessment** (🚦): How does this compare to THEIR best setups?
2. **Deep Pattern Recognition** (🔍): Identify specific winning/losing patterns in THEIR history
3. **Psychological Insight** (🧠): Based on THEIR data, is this emotional state optimal?
4. **Mistake Prevention** (⚠️): What recurring mistakes should they avoid here?
5. **Edge Optimization** (💎): Does this trade align with THEIR proven edge?
6. **Action Recommendation** (✅/❌): Highly personalized - take, adjust, or skip?

This is REAL money and you know THIS trader. Prioritize their historical success patterns.`

    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'AI service temporarily unavailable',
          fallback: 'Trade Copilot is temporarily unavailable. Please try again in a few minutes. Your trade setup has been saved.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    let analysis = '';
    let retryCount = 0;
    const maxRetries = 2;

    // Retry logic for API calls
    while (retryCount <= maxRetries) {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are an expert forex trading copilot providing pre-trade analysis.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ 
                error: 'AI service rate limit. Please try again in a moment.',
                fallback: 'Our AI is experiencing high demand. Please wait a moment and try again.'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ 
                error: 'Payment required',
                fallback: 'Please add funds to continue using Trade Copilot.'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
            );
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        analysis = data.choices[0].message.content;
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error(`Trade copilot attempt ${retryCount} failed:`, error);
        
        if (retryCount > maxRetries) {
          return new Response(
            JSON.stringify({ 
              error: 'Analysis failed after multiple attempts',
              fallback: 'Trade Copilot is temporarily unavailable. Please try again in a few minutes. Your setup looks valid based on basic checks.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
          );
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    // Deduct credits
    await supabaseClient
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - COPILOT_COST })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ 
        analysis,
        credits_remaining: profile.ai_credits - COPILOT_COST,
        statistics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trade-copilot function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
