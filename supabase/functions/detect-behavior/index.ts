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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent trades (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentTrades } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recentTrades || recentTrades.length === 0) {
      return new Response(JSON.stringify({ 
        behaviors: [],
        message: 'No recent trades to analyze'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const behaviors = [];
    
    // Check for revenge trading
    const revengeTrades = detectRevengeTrading(recentTrades);
    if (revengeTrades.length > 0) {
      behaviors.push({
        behavior_type: 'revenge_trading',
        severity: 'high',
        trade_sequence: revengeTrades.map(t => t.id),
        ai_recommendation: 'Take a 30-minute break after losses. Revenge trading detected with increased lot sizes after losses.'
      });
    }

    // Check for overtrading
    const isOvertrading = detectOvertrading(recentTrades);
    if (isOvertrading) {
      behaviors.push({
        behavior_type: 'overtrading',
        severity: 'medium',
        trade_sequence: recentTrades.slice(0, 10).map(t => t.id),
        ai_recommendation: 'You\'ve taken too many trades in a short period. Stick to your trading plan with max 5 trades per session.'
      });
    }

    // Check for lot size escalation
    const escalation = detectLotSizeEscalation(recentTrades);
    if (escalation) {
      behaviors.push({
        behavior_type: 'lot_size_escalation',
        severity: 'high',
        trade_sequence: escalation.trades.map(t => t.id),
        ai_recommendation: 'Lot size is increasing progressively. Return to your standard risk per trade (1-2%).'
      });
    }

    // Save behaviors to database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const behavior of behaviors) {
      await supabaseAdmin.from('trading_behaviors').insert({
        user_id: user.id,
        behavior_type: behavior.behavior_type,
        trade_sequence: behavior.trade_sequence,
        severity: behavior.severity,
        ai_recommendation: behavior.ai_recommendation
      });
    }

    return new Response(JSON.stringify({ 
      behaviors,
      trades_analyzed: recentTrades.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in detect-behavior:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function detectRevengeTrading(trades: any[]) {
  const revengeTrades = [];
  
  for (let i = 0; i < trades.length - 1; i++) {
    const currentTrade = trades[i];
    const nextTrade = trades[i + 1];
    
    // Check if loss followed by quick trade with bigger lot size
    if (currentTrade.result === 'loss' && nextTrade) {
      const timeDiff = new Date(currentTrade.created_at).getTime() - new Date(nextTrade.created_at).getTime();
      const minutesDiff = Math.abs(timeDiff) / (1000 * 60);
      
      const lotIncrease = nextTrade.volume / (currentTrade.volume || 1);
      
      if (minutesDiff < 15 && lotIncrease > 1.3) {
        revengeTrades.push(currentTrade, nextTrade);
      }
    }
  }
  
  return revengeTrades;
}

function detectOvertrading(trades: any[]) {
  // Check if more than 10 trades in last 2 hours
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
  
  const recentTradesCount = trades.filter(t => 
    new Date(t.created_at) > twoHoursAgo
  ).length;
  
  return recentTradesCount > 10;
}

function detectLotSizeEscalation(trades: any[]) {
  if (trades.length < 3) return null;
  
  const last3Trades = trades.slice(0, 3);
  const volumes = last3Trades.map(t => t.volume || 0.01);
  
  // Check if each trade has progressively larger lot size
  const isEscalating = volumes[0] > volumes[1] && volumes[1] > volumes[2];
  const maxIncrease = volumes[0] / volumes[2];
  
  if (isEscalating && maxIncrease > 1.5) {
    return { trades: last3Trades, increase: maxIncrease };
  }
  
  return null;
}
