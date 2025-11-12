import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const fileContent = await file.text();
    const fileName = file.name.toLowerCase();
    
    let trades: any[] = [];

    if (fileName.endsWith('.csv')) {
      trades = parseCSV(fileContent);
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      trades = parseHTML(fileContent);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported file format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (trades.length === 0) {
      return new Response(JSON.stringify({ error: 'No trades found in file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Insert trades
    const tradeInserts = trades.map(trade => ({
      user_id: user.id,
      pair: trade.pair,
      direction: trade.direction,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      stop_loss: trade.stop_loss,
      take_profit: trade.take_profit,
      result: trade.result,
      profit_loss: trade.profit_loss,
      notes: `Imported from MT5 on ${new Date().toLocaleDateString()}`,
      created_at: trade.open_time || new Date().toISOString()
    }));

    const { data: insertedTrades, error: insertError } = await supabase
      .from('trades')
      .insert(tradeInserts)
      .select('id');

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ 
      success: true,
      importedCount: insertedTrades.length,
      tradeIds: insertedTrades.map(t => t.id)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('import-mt5-trades error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const trades: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const trade: any = {};

    headers.forEach((header, index) => {
      trade[header] = values[index];
    });

    // Map CSV columns to our schema
    if (trade.symbol || trade.pair) {
      trades.push({
        pair: (trade.symbol || trade.pair).replace(/[^A-Z]/g, ''),
        direction: detectDirection(trade.type || trade.action),
        entry_price: parseFloat(trade.price || trade.open || trade.entry || 0),
        exit_price: parseFloat(trade.close || trade.exit || 0),
        stop_loss: parseFloat(trade.sl || trade.stop_loss || 0),
        take_profit: parseFloat(trade.tp || trade.take_profit || 0),
        result: detectResult(trade.profit || trade.pnl || trade.pl),
        profit_loss: parseFloat(trade.profit || trade.pnl || trade.pl || 0),
        open_time: trade.time || trade.open_time || new Date().toISOString()
      });
    }
  }

  return trades;
}

function parseHTML(content: string): any[] {
  // Basic HTML table parsing for MT5 reports
  const trades: any[] = [];
  
  // Extract table rows (simplified parsing)
  const rowMatches = content.match(/<tr[^>]*>.*?<\/tr>/gis);
  if (!rowMatches) return trades;

  for (const row of rowMatches.slice(1)) { // Skip header row
    const cellMatches = row.match(/<td[^>]*>(.*?)<\/td>/gis);
    if (!cellMatches || cellMatches.length < 5) continue;

    const cells = cellMatches.map(cell => 
      cell.replace(/<[^>]*>/g, '').trim()
    );

    // Attempt to parse trade data from cells
    if (cells.length >= 8) {
      const pair = cells[1].replace(/[^A-Z]/g, '');
      if (pair.length >= 6) {
        trades.push({
          pair: pair,
          direction: detectDirection(cells[2]),
          entry_price: parseFloat(cells[3]) || 0,
          exit_price: parseFloat(cells[4]) || 0,
          stop_loss: parseFloat(cells[5]) || 0,
          take_profit: parseFloat(cells[6]) || 0,
          result: detectResult(cells[7]),
          profit_loss: parseFloat(cells[7]) || 0,
          open_time: cells[0] || new Date().toISOString()
        });
      }
    }
  }

  return trades;
}

function detectDirection(value: string): string {
  const v = (value || '').toLowerCase();
  if (v.includes('buy') || v.includes('long')) return 'buy';
  if (v.includes('sell') || v.includes('short')) return 'sell';
  return 'buy'; // default
}

function detectResult(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'pending';
  return num > 0 ? 'win' : num < 0 ? 'loss' : 'breakeven';
}
