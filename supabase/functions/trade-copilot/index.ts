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

    // Calculate user's patterns
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

    // Calculate risk-reward ratio
    const riskAmount = Math.abs(entry_price - stop_loss);
    const rewardAmount = Math.abs(take_profit - entry_price);
    const riskRewardRatio = (rewardAmount / riskAmount).toFixed(2);

    const prompt = `You are a professional forex trading copilot. Analyze this PENDING trade setup and provide actionable feedback BEFORE the trader enters:

**Proposed Trade:**
- Pair: ${pair}
- Direction: ${direction}
- Entry: ${entry_price}
- Stop Loss: ${stop_loss}
- Take Profit: ${take_profit}
- Risk/Reward: 1:${riskRewardRatio}
- Trader's Emotion: ${emotion_before}

**Trader's Historical Performance:**
- ${pair} Win Rate: ${pairWinRate}%
- ${direction} trades Win Rate: ${directionWinRate}%
- Trading while "${emotion_before}" Win Rate: ${emotionWinRate}%

**Your Mission:**
1. **Risk Assessment** (🚦): Rate this setup (Green/Yellow/Red) based on risk/reward and statistics
2. **Pattern Recognition** (🔍): Do you see any winning/losing patterns in their history?
3. **Psychological Check** (🧠): Is their emotional state favorable based on past trades?
4. **Key Warnings** (⚠️): Any red flags they should consider?
5. **Action Recommendation** (✅/❌): Should they take this trade? If no, what should change?

Be direct, actionable, and use their personal stats. This is REAL money - prioritize their success.`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
          JSON.stringify({ error: 'AI service rate limit. Please try again in a moment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;
    
    // Deduct credits
    await supabaseClient
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - COPILOT_COST })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ 
        analysis,
        credits_remaining: profile.ai_credits - COPILOT_COST,
        statistics: {
          pairWinRate,
          emotionWinRate,
          directionWinRate,
          riskRewardRatio
        }
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
