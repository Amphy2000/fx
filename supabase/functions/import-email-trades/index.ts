import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

interface TradeData {
  pair: string;
  direction: string;
  entry_price: number;
  exit_price?: number;
  profit_loss?: number;
  volume?: number;
  open_time?: string;
  close_time?: string;
  ticket_number?: string;
  result?: string;
}

// Parse common broker email formats
function parseTradeFromEmail(email: EmailPayload): TradeData[] {
  const content = email.html || email.text || '';
  const trades: TradeData[] = [];

  console.log('Parsing email from:', email.from);
  console.log('Subject:', email.subject);

  // Generic patterns for common broker formats
  const patterns = {
    // Pattern: "Closed position: BUY 0.10 EURUSD at 1.0850, closed at 1.0870, profit: +$20.00"
    generic: /(?:closed|position).*?(buy|sell)\s+(\d+\.?\d*)\s+([A-Z]{6})\s+at\s+([\d.]+).*?closed\s+at\s+([\d.]+).*?(?:profit|p\/l)[:\s]+([-+$€£\d.]+)/gi,
    
    // Pattern: "EURUSD BUY 0.10 Entry: 1.0850 Exit: 1.0870 P/L: +20.00"
    compact: /([A-Z]{6})\s+(buy|sell)\s+(\d+\.?\d*)\s+entry[:\s]+([\d.]+)\s+exit[:\s]+([\d.]+)\s+p\/l[:\s]+([-+\d.]+)/gi,
    
    // Pattern: "Order #12345 closed - GBPUSD SELL 0.5 @ 1.2500 -> 1.2480 = +$100"
    order: /order\s+#?(\d+).*?([A-Z]{6})\s+(buy|sell)\s+(\d+\.?\d*)\s+@\s+([\d.]+)\s+(?:->|to)\s+([\d.]+)\s+=\s+([-+$€£\d.]+)/gi,
  };

  // Try each pattern
  for (const [patternName, regex] of Object.entries(patterns)) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      try {
        let trade: TradeData;
        
        if (patternName === 'generic') {
          const [, direction, volume, pair, entry, exit, profit] = match;
          trade = {
            pair,
            direction: direction.toLowerCase(),
            entry_price: parseFloat(entry),
            exit_price: parseFloat(exit),
            volume: parseFloat(volume),
            profit_loss: parseFloat(profit.replace(/[^-+\d.]/g, '')),
          };
        } else if (patternName === 'compact') {
          const [, pair, direction, volume, entry, exit, profit] = match;
          trade = {
            pair,
            direction: direction.toLowerCase(),
            entry_price: parseFloat(entry),
            exit_price: parseFloat(exit),
            volume: parseFloat(volume),
            profit_loss: parseFloat(profit.replace(/[^-+\d.]/g, '')),
          };
        } else if (patternName === 'order') {
          const [, ticket, pair, direction, volume, entry, exit, profit] = match;
          trade = {
            pair,
            direction: direction.toLowerCase(),
            entry_price: parseFloat(entry),
            exit_price: parseFloat(exit),
            volume: parseFloat(volume),
            profit_loss: parseFloat(profit.replace(/[^-+\d.]/g, '')),
            ticket_number: ticket,
          };
        } else {
          continue;
        }

        // Set result based on profit/loss
        if (trade.profit_loss) {
          trade.result = trade.profit_loss > 0 ? 'win' : 'loss';
        }

        console.log(`Found trade using ${patternName} pattern:`, trade);
        trades.push(trade);
      } catch (error) {
        console.error(`Error parsing trade with ${patternName} pattern:`, error);
      }
    }
  }

  return trades;
}

// Extract user ID from email address (format: user_[userid]@yourdomain.com)
function extractUserId(email: string): string | null {
  const match = email.match(/user_([a-f0-9-]+)@/i);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    console.log('Received email webhook:', { from: payload.from, to: payload.to, subject: payload.subject });

    // Extract user ID from recipient email
    const userId = extractUserId(payload.to);
    if (!userId) {
      console.error('Could not extract user ID from email:', payload.to);
      return new Response(
        JSON.stringify({ error: 'Invalid recipient email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing email for user:', userId);

    // Parse trades from email
    const trades = parseTradeFromEmail(payload);
    
    if (trades.length === 0) {
      console.log('No trades found in email');
      return new Response(
        JSON.stringify({ message: 'No trades found in email', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${trades.length} trade(s) in email`);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert trades into database
    const insertPromises = trades.map(trade => 
      supabase.from('trades').insert({
        user_id: userId,
        ...trade,
        is_auto_synced: true,
        notes: `Imported from email: ${payload.subject}`,
      })
    );

    const results = await Promise.allSettled(insertPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Import complete: ${successful} successful, ${failed} failed`);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to insert trade ${index + 1}:`, result.reason);
      }
    });

    return new Response(
      JSON.stringify({
        message: 'Email processed',
        processed: successful,
        failed: failed,
        trades_found: trades.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
