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

    // Fetch all trades with setup information
    const { data: trades } = await supabase
      .from('trades')
      .select('*, setups(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!trades || trades.length < 20) {
      return new Response(JSON.stringify({ patterns: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group trades by setup
    const setupGroups: any = {};
    trades.forEach((trade: any) => {
      const setupName = trade.setups?.name || trade.notes?.split(' ')[0] || 'Unnamed Setup';
      if (!setupGroups[setupName]) setupGroups[setupName] = [];
      setupGroups[setupName].push(trade);
    });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const patterns = [];

    for (const [setupName, setupTrades] of Object.entries(setupGroups)) {
      const typedTrades = setupTrades as any[];
      
      if (typedTrades.length < 5) continue; // Need at least 5 trades to identify pattern

      const wins = typedTrades.filter(t => t.result === 'win').length;
      const losses = typedTrades.filter(t => t.result === 'loss').length;
      const winRate = Math.round((wins / typedTrades.length) * 100);
      
      const totalWin = typedTrades.filter(t => t.result === 'win').reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const totalLoss = Math.abs(typedTrades.filter(t => t.result === 'loss').reduce((sum, t) => sum + (t.profit_loss || 0), 0));
      const profitFactor = totalLoss > 0 ? totalWin / totalLoss : 0;
      
      const avgR = typedTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / typedTrades.length;

      // Calculate trend (last 10 vs previous trades)
      const recent = typedTrades.slice(-10);
      const previous = typedTrades.slice(0, -10);
      const recentWR = recent.filter(t => t.result === 'win').length / recent.length;
      const prevWR = previous.length > 0 ? previous.filter(t => t.result === 'win').length / previous.length : 0;
      const trending = recentWR > prevWR + 0.1 ? 'up' : recentWR < prevWR - 0.1 ? 'down' : 'stable';

      let aiAnalysis = null;
      if (lovableApiKey && winRate >= 40) { // Only analyze promising setups
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
                content: 'You are a trading pattern analyst. Identify what makes this setup successful. Be specific and actionable.'
              }, {
                role: 'user',
                content: `Analyze this trade setup pattern:
Setup: ${setupName}
Trades: ${typedTrades.length}
Win Rate: ${winRate}%
Profit Factor: ${profitFactor.toFixed(2)}
Avg R: ${avgR.toFixed(2)}

Based on this data, provide:
1. Three specific conditions that make this setup work best
2. Two common mistakes traders make with this setup
3. Confidence score (0-100) in this pattern's reliability

Format as JSON:
{
  "bestConditions": ["condition1", "condition2", "condition3"],
  "commonMistakes": ["mistake1", "mistake2"],
  "confidence": number
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
                aiAnalysis = JSON.parse(jsonMatch[0]);
              }
            } catch (e) {
              console.error('Failed to parse AI JSON:', e);
            }
          }
        } catch (error) {
          console.error('AI call failed:', error);
        }
      }

      patterns.push({
        setupName,
        totalTrades: typedTrades.length,
        winRate,
        profitFactor: Number(profitFactor.toFixed(2)),
        avgR: Number(avgR.toFixed(2)),
        bestConditions: aiAnalysis?.bestConditions || [
          'Trade with the trend',
          'Wait for confirmation',
          'Use proper risk management'
        ],
        commonMistakes: aiAnalysis?.commonMistakes || [
          'Entering too early',
          'Ignoring stop loss levels'
        ],
        confidence: aiAnalysis?.confidence || Math.min(winRate, 85),
        trending
      });
    }

    // Sort by confidence and win rate
    patterns.sort((a, b) => (b.confidence * b.winRate) - (a.confidence * a.winRate));

    return new Response(JSON.stringify({ patterns: patterns.slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in pattern-recognition:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
