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
    console.log('mt5-sync: Request received');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('mt5-sync: Auth error', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    const { accountId, trades: newTrades } = await req.json();
    
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // If no trades provided, just update account status and return
    if (!newTrades || !Array.isArray(newTrades) || newTrades.length === 0) {
      await supabase
        .from('mt5_accounts')
        .update({ 
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success'
        })
        .eq('id', accountId)
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Account ready for sync. No trades to process.',
          imported: 0,
          updated: 0
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`mt5-sync: Processing ${newTrades.length} trades for account ${accountId}`);

    // Create sync log
    const syncStartTime = Date.now();
    const { data: syncLog, error: syncLogError } = await supabase
      .from('sync_logs')
      .insert({
        mt5_account_id: accountId,
        user_id: user.id,
        sync_type: 'manual',
        status: 'started'
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError);
    }

    let imported = 0;
    let updated = 0;
    const tradeIds: string[] = [];

    for (const trade of newTrades) {
      try {
        // Check if trade exists by ticket number
        const { data: existingTrade } = await supabase
          .from('trades')
          .select('id')
          .eq('ticket_number', trade.ticket)
          .eq('user_id', user.id)
          .maybeSingle();

        // Calculate session based on open time
        const openTime = new Date(trade.openTime);
        const hour = openTime.getUTCHours();
        let session = 'other';
        if (hour >= 0 && hour < 8) session = 'asia';
        else if (hour >= 8 && hour < 13) session = 'london';
        else if (hour >= 13 && hour < 21) session = 'new_york';
        else if (hour >= 21) session = 'sydney';

        // Calculate R-multiple if stop loss exists
        let rMultiple = null;
        if (trade.stopLoss && trade.entryPrice && trade.exitPrice) {
          const risk = Math.abs(trade.entryPrice - trade.stopLoss);
          const reward = trade.direction === 'buy' 
            ? (trade.exitPrice - trade.entryPrice)
            : (trade.entryPrice - trade.exitPrice);
          rMultiple = risk > 0 ? reward / risk : null;
        }

        const tradeData = {
          user_id: user.id,
          mt5_account_id: accountId,
          ticket_number: trade.ticket?.toString(),
          pair: trade.symbol,
          direction: trade.direction?.toLowerCase() || 'buy',
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          stop_loss: trade.stopLoss,
          take_profit: trade.takeProfit,
          volume: trade.volume,
          profit_loss: trade.profit,
          commission: trade.commission || 0,
          swap: trade.swap || 0,
          magic_number: trade.magicNumber,
          comment: trade.comment,
          open_time: trade.openTime,
          close_time: trade.closeTime,
          session,
          r_multiple: rMultiple,
          result: trade.profit > 0 ? 'win' : trade.profit < 0 ? 'loss' : 'breakeven',
          is_auto_synced: true,
          created_at: trade.openTime,
          updated_at: trade.closeTime || new Date().toISOString()
        };

        if (existingTrade) {
          // Update existing trade
          const { error: updateError } = await supabase
            .from('trades')
            .update(tradeData)
            .eq('id', existingTrade.id);

          if (updateError) {
            console.error(`Failed to update trade ${trade.ticket}:`, updateError);
          } else {
            updated++;
            tradeIds.push(existingTrade.id);
          }
        } else {
          // Insert new trade
          const { data: newTrade, error: insertError } = await supabase
            .from('trades')
            .insert(tradeData)
            .select('id')
            .single();

          if (insertError) {
            console.error(`Failed to insert trade ${trade.ticket}:`, insertError);
          } else {
            imported++;
            if (newTrade) tradeIds.push(newTrade.id);
          }
        }

        // Auto-tag the trade
        await autoTagTrade(supabase, tradeIds[tradeIds.length - 1], tradeData, user.id);

      } catch (tradeError) {
        console.error('Error processing trade:', tradeError);
      }
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'completed',
          trades_imported: imported,
          trades_updated: updated,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - syncStartTime
        })
        .eq('id', syncLog.id);
    }

    // Update account sync status
    await supabase
      .from('mt5_accounts')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        sync_error: null
      })
      .eq('id', accountId);

    // Calculate and store performance metrics
    await calculatePerformanceMetrics(supabase, user.id, accountId);

    console.log(`mt5-sync: Completed - imported: ${imported}, updated: ${updated}`);

    return new Response(JSON.stringify({ 
      success: true,
      imported,
      updated,
      total: imported + updated,
      tradeIds
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('mt5-sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Auto-tag trades based on patterns
async function autoTagTrade(supabase: any, tradeId: string, trade: any, userId: string) {
  const tags: Array<{trade_id: string, user_id: string, tag_name: string, tag_type: string, confidence: number}> = [];

  // Tag by session
  if (trade.session) {
    tags.push({
      trade_id: tradeId,
      user_id: userId,
      tag_name: `session_${trade.session}`,
      tag_type: 'auto',
      confidence: 1.0
    });
  }

  // Tag by pair
  tags.push({
    trade_id: tradeId,
    user_id: userId,
    tag_name: `pair_${trade.pair.replace('/', '_')}`,
    tag_type: 'auto',
    confidence: 1.0
  });

  // Tag by R-multiple range
  if (trade.r_multiple !== null) {
    let rTag = '';
    if (trade.r_multiple >= 3) rTag = 'r_3plus';
    else if (trade.r_multiple >= 2) rTag = 'r_2to3';
    else if (trade.r_multiple >= 1) rTag = 'r_1to2';
    else if (trade.r_multiple > 0) rTag = 'r_under1';
    else rTag = 'r_negative';
    
    tags.push({
      trade_id: tradeId,
      user_id: userId,
      tag_name: rTag,
      tag_type: 'auto',
      confidence: 1.0
    });
  }

  // Tag by lot size behavior
  if (trade.volume) {
    if (trade.volume < 0.1) {
      tags.push({
        trade_id: tradeId,
        user_id: userId,
        tag_name: 'micro_lot',
        tag_type: 'auto',
        confidence: 1.0
      });
    } else if (trade.volume >= 1) {
      tags.push({
        trade_id: tradeId,
        user_id: userId,
        tag_name: 'standard_lot',
        tag_type: 'auto',
        confidence: 1.0
      });
    }
  }

  // Insert tags (ignore duplicates)
  for (const tag of tags) {
    await supabase
      .from('trade_tags')
      .insert(tag)
      .select()
      .maybeSingle();
  }
}

// Calculate performance metrics
async function calculatePerformanceMetrics(supabase: any, userId: string, accountId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get all trades for this account
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('mt5_account_id', accountId)
      .not('result', 'is', null);

    if (!trades || trades.length === 0) return;

    const wins = trades.filter((t: any) => t.result === 'win');
    const losses = trades.filter((t: any) => t.result === 'loss');
    
    const totalWin = wins.reduce((sum: number, t: any) => sum + (t.profit_loss || 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum: number, t: any) => sum + (t.profit_loss || 0), 0));
    
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : 0;
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    
    const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    
    // Calculate drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningBalance = 0;
    
    trades.forEach((t: any) => {
      runningBalance += t.profit_loss || 0;
      if (runningBalance > peak) peak = runningBalance;
      const drawdown = peak - runningBalance;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    const avgR = trades
      .filter((t: any) => t.r_multiple !== null)
      .reduce((sum: number, t: any) => sum + (t.r_multiple || 0), 0) / trades.length || 0;

    // Calculate consecutive streaks
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    trades.forEach((t: any) => {
      if (t.result === 'win') {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if (t.result === 'loss') {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }
    });

    // Store metrics
    await supabase
      .from('performance_metrics')
      .upsert({
        user_id: userId,
        mt5_account_id: accountId,
        metric_date: today,
        total_trades: trades.length,
        winning_trades: wins.length,
        losing_trades: losses.length,
        win_rate: winRate,
        profit_factor: profitFactor,
        average_win: avgWin,
        average_loss: avgLoss,
        largest_win: Math.max(...wins.map((t: any) => t.profit_loss || 0), 0),
        largest_loss: Math.min(...losses.map((t: any) => t.profit_loss || 0), 0),
        max_drawdown: maxDrawdown,
        average_r: avgR,
        consecutive_wins: maxWinStreak,
        consecutive_losses: maxLossStreak
      }, {
        onConflict: 'user_id,mt5_account_id,metric_date'
      });

  } catch (error) {
    console.error('Error calculating metrics:', error);
  }
}
