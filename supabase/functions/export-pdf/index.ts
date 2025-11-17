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

    const { startDate, endDate } = await req.json();

    // Fetch all necessary data
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ error: 'No trades found for this period' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate stats
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const winRate = (wins / trades.length) * 100;
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalWin = trades.filter(t => t.result === 'win').reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const totalLoss = Math.abs(trades.filter(t => t.result === 'loss').reduce((sum, t) => sum + (t.profit_loss || 0), 0));
    const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : '0';

    // Generate HTML report
    const htmlReport = generateHTMLReport({
      profile,
      trades,
      stats: {
        totalTrades: trades.length,
        wins,
        losses,
        winRate: winRate.toFixed(2),
        profitFactor,
        totalPnL: totalPnL.toFixed(2),
        startDate,
        endDate
      }
    });

    // Return HTML for client-side PDF generation
    return new Response(JSON.stringify({ 
      html: htmlReport,
      fileName: `trading-report-${startDate}-${endDate}.pdf`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('PDF export error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateHTMLReport(data: any): string {
  const { profile, trades, stats } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    h1 { color: #d4af37; border-bottom: 3px solid #d4af37; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #d4af37; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .stat-value { font-size: 28px; font-weight: bold; margin: 10px 0; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .logo { text-align: center; margin-bottom: 30px; }
    .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="logo">
    <h1>📊 Trading Performance Report</h1>
    <p style="color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
  </div>

  <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3>Trader: ${profile?.full_name || profile?.email || 'Unknown'}</h3>
    <p>Period: ${stats.startDate} to ${stats.endDate}</p>
  </div>

  <h2>📈 Performance Summary</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Trades</div>
      <div class="stat-value">${stats.totalTrades}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value ${parseFloat(stats.winRate) > 50 ? 'positive' : 'negative'}">${stats.winRate}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Profit Factor</div>
      <div class="stat-value ${parseFloat(stats.profitFactor) > 1 ? 'positive' : 'negative'}">${stats.profitFactor}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Wins</div>
      <div class="stat-value positive">${stats.wins}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Losses</div>
      <div class="stat-value negative">${stats.losses}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total P/L</div>
      <div class="stat-value ${parseFloat(stats.totalPnL) >= 0 ? 'positive' : 'negative'}">$${stats.totalPnL}</div>
    </div>
  </div>

  <h2>📋 Trade History</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Pair</th>
        <th>Direction</th>
        <th>Entry</th>
        <th>Exit</th>
        <th>Result</th>
        <th>P/L</th>
        <th>R-Multiple</th>
      </tr>
    </thead>
    <tbody>
      ${trades.map((trade: any) => `
        <tr>
          <td>${new Date(trade.created_at).toLocaleDateString()}</td>
          <td>${trade.pair}</td>
          <td>${trade.direction.toUpperCase()}</td>
          <td>${trade.entry_price}</td>
          <td>${trade.exit_price || 'N/A'}</td>
          <td style="color: ${trade.result === 'win' ? '#22c55e' : '#ef4444'}; font-weight: bold;">${trade.result?.toUpperCase() || 'N/A'}</td>
          <td style="color: ${(trade.profit_loss || 0) >= 0 ? '#22c55e' : '#ef4444'};">$${(trade.profit_loss || 0).toFixed(2)}</td>
          <td>${trade.r_multiple ? trade.r_multiple.toFixed(2) + 'R' : 'N/A'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated by TradeTracker Pro | © ${new Date().getFullYear()}</p>
    <p>This report is confidential and intended for personal use only.</p>
  </div>
</body>
</html>
  `;
}
