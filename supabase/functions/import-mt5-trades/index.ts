import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('import-mt5-trades: Request received');
    
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('import-mt5-trades: Auth error', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    console.log('import-mt5-trades: User authenticated:', user.id);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('import-mt5-trades: No file provided');
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('import-mt5-trades: File received:', file.name, 'Size:', file.size);

    const fileContent = await file.text();
    const fileName = file.name.toLowerCase();
    
    console.log('import-mt5-trades: File content length:', fileContent.length);
    
    let trades: any[] = [];

    if (fileName.endsWith('.csv')) {
      console.log('import-mt5-trades: Parsing CSV file');
      trades = parseCSV(fileContent);
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      console.log('import-mt5-trades: Parsing HTML file');
      trades = parseHTML(fileContent);
    } else {
      console.error('import-mt5-trades: Unsupported file format:', fileName);
      return new Response(JSON.stringify({ error: 'Unsupported file format. Please upload .csv or .html file.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('import-mt5-trades: Parsed trades count:', trades.length);

    if (trades.length === 0) {
      console.error('import-mt5-trades: No trades found in file');
      return new Response(JSON.stringify({ 
        error: 'No trades found in file. Please ensure the file is a valid MT5 trade report.' 
      }), {
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

    console.log('import-mt5-trades: Inserting trades to database');

    const { data: insertedTrades, error: insertError } = await supabase
      .from('trades')
      .insert(tradeInserts)
      .select('id');

    if (insertError) {
      console.error('import-mt5-trades: Database insert error:', insertError);
      throw insertError;
    }

    console.log('import-mt5-trades: Successfully inserted', insertedTrades.length, 'trades');

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
  try {
    const lines = content.split('\n').filter(line => line.trim());
    console.log('parseCSV: Total lines:', lines.length);
    
    if (lines.length < 2) {
      console.log('parseCSV: Not enough lines');
      return [];
    }

    // Try different delimiters (comma, semicolon, tab)
    const delimiters = [',', ';', '\t'];
    let bestDelimiter = ',';
    let maxColumns = 0;

    for (const delimiter of delimiters) {
      const columnCount = lines[0].split(delimiter).length;
      if (columnCount > maxColumns) {
        maxColumns = columnCount;
        bestDelimiter = delimiter;
      }
    }

    console.log('parseCSV: Using delimiter:', bestDelimiter === '\t' ? 'TAB' : bestDelimiter);

    const headers = lines[0].split(bestDelimiter).map(h => h.trim().toLowerCase());
    console.log('parseCSV: Headers:', headers);
    
    const trades: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(bestDelimiter).map(v => v.trim());
      const trade: any = {};

      headers.forEach((header, index) => {
        trade[header] = values[index] || '';
      });

      // Map CSV columns to our schema - handle various MT5 export formats
      const symbol = trade.symbol || trade.pair || trade.currency || trade.instrument || '';
      
      if (symbol && symbol.length >= 6) {
        const cleanSymbol = symbol.replace(/[^A-Z]/gi, '').toUpperCase();
        
        trades.push({
          pair: cleanSymbol.substring(0, 6), // Take first 6 characters (e.g., EURUSD)
          direction: detectDirection(trade.type || trade.action || trade.cmd || trade.order_type || ''),
          entry_price: parseFloat(trade.price || trade.open || trade.entry || trade.open_price || '0') || 0,
          exit_price: parseFloat(trade.close || trade.exit || trade.close_price || '0') || 0,
          stop_loss: parseFloat(trade.sl || trade.stop_loss || trade.s_l || '0') || 0,
          take_profit: parseFloat(trade.tp || trade.take_profit || trade.t_p || '0') || 0,
          result: detectResult(trade.profit || trade.pnl || trade.pl || trade.result || '0'),
          profit_loss: parseFloat(trade.profit || trade.pnl || trade.pl || '0') || 0,
          open_time: trade.time || trade.open_time || trade.date || new Date().toISOString()
        });
      }
    }

    console.log('parseCSV: Successfully parsed', trades.length, 'trades');
    return trades;
  } catch (error) {
    console.error('parseCSV error:', error);
    return [];
  }
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
  if (v.includes('buy') || v.includes('long') || v === '0') return 'buy';
  if (v.includes('sell') || v.includes('short') || v === '1') return 'sell';
  return 'buy'; // default
}

function detectResult(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'pending';
  return num > 0 ? 'win' : num < 0 ? 'loss' : 'breakeven';
}
