import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile query error:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch profile',
        details: profileError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
      
    const EXTRACTION_COST = 10;
    console.log('User credits check:', { userId: user.id, credits: profile?.ai_credits, required: EXTRACTION_COST });
    
    if (!profile || profile.ai_credits < EXTRACTION_COST) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits',
        required: EXTRACTION_COST,
        available: profile?.ai_credits || 0
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use vision + structured output for extraction
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a professional trading chart analyst. Extract visible trading data from this screenshot with EXTREME care on direction.

🎯 CRITICAL DIRECTION RULES - READ CAREFULLY:

For LONG/BUY trades, you will see:
- Green/bullish candles at entry area
- Price is ABOVE previous lows (uptrend context)
- Entry line is at SUPPORT or pullback level
- Stop Loss is BELOW entry
- Take Profit is ABOVE entry
- Arrows pointing UP or text saying "BUY" or "LONG"
- Chart shows bullish momentum

For SHORT/SELL trades, you will see:
- Red/bearish candles at entry area  
- Price is BELOW previous highs (downtrend context)
- Entry line is at RESISTANCE or rejection level
- Stop Loss is ABOVE entry
- Take Profit is BELOW entry
- Arrows pointing DOWN or text saying "SELL" or "SHORT"
- Chart shows bearish momentum

⚠️ DIRECTION DETECTION PRIORITY:
1. Look at SL/TP placement relative to entry (SL below entry = BUY, SL above entry = SELL)
2. Check for arrows or text labels (BUY/SELL/LONG/SHORT)
3. Analyze candle colors and price action context
4. If you see "Long" → return "buy" | If you see "Short" → return "sell"

📊 DATA EXTRACTION RULES:

CORE DATA (Always try to extract):
- pair: Currency pair (e.g., "EURUSD", "GBPJPY")
- direction: MUST be "buy" or "sell" (NOT "long" or "short")
- entry_price: Entry price level
- stop_loss: Stop loss level (if visible)
- take_profit: Take profit level (if visible)
- setup_name: Setup type (e.g., "Breakout", "Support Bounce", "Trendline Break")
- timeframe: Chart timeframe (e.g., "1H", "4H", "Daily")
- session: Trading session (e.g., "London", "New York", "Asian")

BROKER-ONLY DATA (Only extract if visible in broker platform screenshot):
- lot_size: Position size ONLY if this is an MT5/broker screenshot
- profit_loss: P/L amount ONLY if this is a broker screenshot showing closed trade
- exit_price: Exit price if trade is closed

ANALYSIS DATA:
- risk_reward: R:R ratio if calculable from visible SL/TP
- emotion: If trader's notes/text visible, infer emotion (confident/anxious/excited/frustrated/calm/fearful/greedy)
- notes: Brief context about indicators, confluences, patterns visible, or any trader notes on screenshot

🚫 DO NOT GUESS:
- If lot_size not visible (TradingView charts), DO NOT include it
- If profit_loss not visible, DO NOT include it  
- If exit_price not shown, DO NOT include it
- If no emotional cues visible, leave emotion empty
- Accuracy over completeness - skip fields you're unsure about

✅ CONFIDENCE CHECK:
Before returning, ask yourself:
- Is the direction correct based on SL/TP placement?
- Did I verify the direction using multiple indicators?
- Did I only extract data that's clearly visible?`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }],
        tools: [{
          type: "function",
          function: {
            name: "extract_trade_data",
            description: "Extract comprehensive trading data from a chart screenshot with enhanced fields",
            parameters: {
              type: "object",
              properties: {
                pair: { type: "string", description: "Currency pair (e.g., EURUSD)" },
                direction: { type: "string", enum: ["buy", "sell"], description: "Trade direction - MUST be buy or sell only. Check SL/TP placement relative to entry to confirm." },
                entry_price: { type: "number", description: "Entry price" },
                stop_loss: { type: "number", description: "Stop loss price if visible" },
                take_profit: { type: "number", description: "Take profit price if visible" },
                exit_price: { type: "number", description: "Exit price ONLY if trade is closed and visible" },
                lot_size: { type: "number", description: "Position size ONLY if visible in broker screenshot (not TradingView)" },
                profit_loss: { type: "number", description: "P/L amount ONLY if visible in broker screenshot (not TradingView)" },
                setup_name: { type: "string", description: "Trading setup name/type if identifiable" },
                timeframe: { type: "string", description: "Chart timeframe if visible" },
                session: { type: "string", description: "Trading session if identifiable" },
                risk_reward: { type: "string", description: "Risk-reward ratio if calculable (e.g., 1:3)" },
                result: { type: "string", enum: ["open", "win", "loss", "breakeven"], description: "Trade outcome ONLY if clearly visible (e.g., closed trade in broker)" },
                emotion: { type: "string", description: "Inferred trader emotion from visible notes/text (confident/anxious/excited/frustrated/calm/fearful/greedy)" },
                trade_timestamp: { type: "string", description: "Trade date/time in ISO format if visible" },
                notes: { type: "string", description: "Brief context about indicators, patterns, confluences, or any trader notes visible in the chart" }
              },
              required: ["pair", "direction", "entry_price"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_trade_data" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const extractedData = toolCall ? JSON.parse(toolCall.function.arguments) : null;
    
    // Deduct credits
    await supabaseAdmin
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - EXTRACTION_COST })
      .eq('id', user.id);

    return new Response(JSON.stringify({ 
      extracted_data: extractedData,
      confidence: 0.85,
      credits_remaining: profile.ai_credits - EXTRACTION_COST
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in extract-trade-data:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
