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

    const { startDate, endDate, type = 'trades' } = await req.json();

    if (type === 'trades') {
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (!trades || trades.length === 0) {
        return new Response(JSON.stringify({ error: 'No trades found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const csv = generateTradesCSV(trades);
      
      return new Response(JSON.stringify({ 
        csv,
        fileName: `trades-${startDate}-${endDate}.csv`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'analytics') {
      // Generate analytics CSV with daily/weekly breakdowns
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (!trades || trades.length === 0) {
        return new Response(JSON.stringify({ error: 'No data found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const csv = generateAnalyticsCSV(trades);
      
      return new Response(JSON.stringify({ 
        csv,
        fileName: `analytics-${startDate}-${endDate}.csv`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid export type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('CSV export error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateTradesCSV(trades: any[]): string {
  const headers = [
    'Date',
    'Time',
    'Pair',
    'Direction',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Take Profit',
    'Volume',
    'Result',
    'Profit/Loss',
    'R-Multiple',
    'Session',
    'Commission',
    'Swap',
    'Duration (hours)',
    'Notes'
  ];

  const rows = trades.map(trade => {
    const openTime = trade.open_time ? new Date(trade.open_time) : new Date(trade.created_at);
    const closeTime = trade.close_time ? new Date(trade.close_time) : null;
    const duration = closeTime ? ((closeTime.getTime() - openTime.getTime()) / (1000 * 60 * 60)).toFixed(2) : 'N/A';

    return [
      openTime.toLocaleDateString(),
      openTime.toLocaleTimeString(),
      trade.pair,
      trade.direction,
      trade.entry_price,
      trade.exit_price || 'N/A',
      trade.stop_loss || 'N/A',
      trade.take_profit || 'N/A',
      trade.volume || 'N/A',
      trade.result || 'N/A',
      trade.profit_loss || 0,
      trade.r_multiple || 'N/A',
      trade.session || 'N/A',
      trade.commission || 0,
      trade.swap || 0,
      duration,
      (trade.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

function generateAnalyticsCSV(trades: any[]): string {
  // Group trades by day
  const dailyStats: any = {};

  trades.forEach(trade => {
    const date = new Date(trade.created_at).toLocaleDateString();
    
    if (!dailyStats[date]) {
      dailyStats[date] = {
        trades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
        volume: 0
      };
    }

    dailyStats[date].trades++;
    if (trade.result === 'win') dailyStats[date].wins++;
    if (trade.result === 'loss') dailyStats[date].losses++;
    dailyStats[date].totalPnL += trade.profit_loss || 0;
    dailyStats[date].volume += trade.volume || 0;
  });

  const headers = [
    'Date',
    'Total Trades',
    'Wins',
    'Losses',
    'Win Rate %',
    'Total P/L',
    'Total Volume',
    'Avg P/L per Trade'
  ];

  const rows = Object.entries(dailyStats).map(([date, stats]: [string, any]) => {
    const winRate = stats.trades > 0 ? ((stats.wins / stats.trades) * 100).toFixed(2) : '0';
    const avgPnL = stats.trades > 0 ? (stats.totalPnL / stats.trades).toFixed(2) : '0';

    return [
      date,
      stats.trades,
      stats.wins,
      stats.losses,
      winRate,
      stats.totalPnL.toFixed(2),
      stats.volume.toFixed(2),
      avgPnL
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}
