import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('import-mt5-trades: Request received');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('import-mt5-trades: No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { 
        headers: { 
          Authorization: authHeader 
        } 
      }
    });

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
    // Normalize newlines and strip BOM
    const raw = content.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
    const lines = raw.split("\n").filter(line => line.trim());
    console.log('parseCSV: Total lines:', lines.length);
    if (lines.length < 2) return [];

    // Determine best delimiter based on first 5 lines
    const delimiters = [',', ';', '\t'];
    const pickDelimiter = () => {
      let best = ','; let bestScore = 0;
      for (const d of delimiters) {
        let total = 0; let count = 0;
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i];
          const parts = d === '\t' ? line.split('\t') : splitCSVLine(line, d);
          total += parts.length; count++;
        }
        const avg = total / Math.max(count, 1);
        if (avg > bestScore) { bestScore = avg; best = d; }
      }
      return best;
    };

    const delimiter = pickDelimiter();
    console.log('parseCSV: Using delimiter:', delimiter === '\t' ? 'TAB' : delimiter);

    const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const headerParts = delimiter === '\t' ? lines[0].split('\t') : splitCSVLine(lines[0], delimiter);
    const headers = headerParts.map(normalizeHeader);
    console.log('parseCSV: Headers:', headers);

    const getNum = (s: string): number => {
      if (!s) return 0;
      let x = ('' + s).replace(/\s/g, '');
      // Remove currency symbols and letters
      x = x.replace(/[^0-9.,\-]/g, '');
      const hasComma = x.includes(',');
      const hasDot = x.includes('.');
      if (hasComma && hasDot) {
        // Assume dot as thousand sep and comma as decimal
        x = x.replace(/\./g, '').replace(/,/g, '.');
      } else if (hasComma && !hasDot) {
        x = x.replace(/,/g, '.');
      }
      const n = parseFloat(x);
      return Number.isFinite(n) ? n : 0;
    };

    const symbolKeys = ['symbol','pair','currency','instrument','market','ticker','symbol_name','asset'];
    const dirKeys = ['type','action','cmd','order_type','side'];
    const openKeys = ['price','open','entry','open_price','open_price_','open_time_price'];
    const closeKeys = ['close','exit','close_price','close_price_'];
    const slKeys = ['sl','stop_loss','s_l'];
    const tpKeys = ['tp','take_profit','t_p'];
    const profitKeys = ['profit','pnl','pl','net_profit','result'];
    const timeKeys = ['time','open_time','open_date','date'];

    const trades: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = delimiter === '\t' ? lines[i].split('\t') : splitCSVLine(lines[i], delimiter);
      if (!parts.length) continue;
      const row: Record<string,string> = {};
      headers.forEach((h, idx) => { row[h] = (parts[idx] ?? '').trim().replace(/^"|"$/g, ''); });

      const pick = (keys: string[]) => keys.map(k => row[k]).find(v => v && v.length > 0) || '';

      const rawSymbol = pick(symbolKeys);
      const cleanSymbol = (rawSymbol || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const direction = detectDirection(pick(dirKeys));
      const entry = getNum(pick(openKeys));
      const exit = getNum(pick(closeKeys));
      const sl = getNum(pick(slKeys));
      const tp = getNum(pick(tpKeys));
      const profit = getNum(pick(profitKeys));
      const when = pick(timeKeys) || new Date().toISOString();

      // Accept symbols with >=3 chars (to include indices like US30)
      if (cleanSymbol && cleanSymbol.length >= 3 && direction && entry > 0) {
        trades.push({
          pair: cleanSymbol,
          direction,
          entry_price: entry,
          exit_price: exit || null,
          stop_loss: sl || null,
          take_profit: tp || null,
          result: detectResult(profit),
          profit_loss: profit || null,
          open_time: when
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

// Split a CSV line by delimiter, ignoring delimiters inside quotes
function splitCSVLine(line: string, delimiter: string): string[] {
  const esc = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${esc}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`);
  return line.split(regex);
}

function parseHTML(content: string): any[] {
  const trades: any[] = [];
  if (!content) return trades;

  // Normalize content
  const html = content.replace(/\r\n/g, '\n');

  // Try to detect header row (th)
  const headerMatch = html.match(/<tr[^>]*>\s*([\s\S]*?)<\/tr>/i);
  let headers: string[] = [];
  if (headerMatch) {
    const ths = headerMatch[1].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || [];
    headers = ths.map((h) => h.replace(/<[^>]*>/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  }

  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  if (rows.length <= 1) return trades;

  const pickIdx = (obj: string[], idx: number) => (idx >= 0 && idx < obj.length ? obj[idx] : '');
  const getNum = (s: string) => {
    let x = (s || '').replace(/\s/g, '');
    x = x.replace(/[^0-9.,\-]/g, '');
    if (x.includes(',') && x.includes('.')) x = x.replace(/\./g, '').replace(/,/g, '.');
    else if (x.includes(',') && !x.includes('.')) x = x.replace(/,/g, '.');
    const n = parseFloat(x);
    return Number.isFinite(n) ? n : 0;
  };

  const findByHeader = (rowVals: string[], name: string[]): string => {
    if (!headers.length) return '';
    for (const key of name) {
      const idx = headers.indexOf(key);
      if (idx !== -1) return pickIdx(rowVals, idx);
    }
    return '';
  };

  const symbolKeys = ['symbol','pair','currency','instrument','market','ticker','symbol_name','asset'];
  const dirKeys = ['type','action','cmd','order_type','side'];
  const openKeys = ['price','open','entry','open_price'];
  const closeKeys = ['close','exit','close_price'];
  const slKeys = ['sl','stop_loss','s_l'];
  const tpKeys = ['tp','take_profit','t_p'];
  const profitKeys = ['profit','pnl','pl','net_profit','result'];
  const timeKeys = ['time','open_time','open_date','date'];

  for (let r = 1; r < rows.length; r++) {
    const cells = (rows[r].match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || [])
      .map(c => c.replace(/<[^>]*>/g, '').trim());
    if (!cells.length) continue;

    const rawSymbol = headers.length ? findByHeader(cells, symbolKeys) : pickIdx(cells, 1);
    const cleanSymbol = (rawSymbol || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const direction = detectDirection(headers.length ? findByHeader(cells, dirKeys) : pickIdx(cells, 2));
    const entry = getNum(headers.length ? findByHeader(cells, openKeys) : pickIdx(cells, 3));
    const exit = getNum(headers.length ? findByHeader(cells, closeKeys) : pickIdx(cells, 4));
    const sl = getNum(headers.length ? findByHeader(cells, slKeys) : pickIdx(cells, 5));
    const tp = getNum(headers.length ? findByHeader(cells, tpKeys) : pickIdx(cells, 6));
    const profit = getNum(headers.length ? findByHeader(cells, profitKeys) : pickIdx(cells, 7));
    const when = headers.length ? findByHeader(cells, timeKeys) : pickIdx(cells, 0);

    if (cleanSymbol && cleanSymbol.length >= 3 && direction && entry > 0) {
      trades.push({
        pair: cleanSymbol,
        direction,
        entry_price: entry,
        exit_price: exit || null,
        stop_loss: sl || null,
        take_profit: tp || null,
        result: detectResult(profit),
        profit_loss: profit || null,
        open_time: when || new Date().toISOString(),
      });
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
