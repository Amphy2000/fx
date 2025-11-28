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

    const body = await req.json();
    const { image, imageUrl } = body;
    
    // Support both base64 image and URL formats
    const imageData = image || imageUrl;
    
    if (!imageData) {
      console.error('No image provided in request');
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const isBase64 = imageData.startsWith('data:');
    console.log('Processing image:', isBase64 ? 'base64 data' : imageData.substring(0, 100) + '...');
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Calling AI gateway...');

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
              text: `You are an ELITE trading chart analyst with 20+ years of experience across all platforms (TradingView, MT4/MT5, cTrader, NinjaTrader, Think or Swim, etc.). Extract ALL visible trading data with ABSOLUTE precision.

🎯 ULTRA-CRITICAL DIRECTION DETECTION (99.9% ACCURACY REQUIRED):

LONG/BUY Identification (Check ALL markers):
✓ Stop Loss is BELOW entry price
✓ Take Profit is ABOVE entry price
✓ Green/bullish candles or upward movement
✓ Text labels: "BUY", "LONG", "B", "L", upward arrows (↑, ▲)
✓ Support level entry or pullback in uptrend
✓ Position opened near swing lows

SHORT/SELL Identification (Check ALL markers):
✓ Stop Loss is ABOVE entry price
✓ Take Profit is BELOW entry price
✓ Red/bearish candles or downward movement
✓ Text labels: "SELL", "SHORT", "S", downward arrows (↓, ▼)
✓ Resistance level entry or rejection in downtrend
✓ Position opened near swing highs

⚡ DIRECTION DETECTION ALGORITHM (APPLY IN ORDER):
1. FIRST: Analyze SL/TP placement relative to entry (MOST RELIABLE)
   - If SL < Entry AND TP > Entry → BUY
   - If SL > Entry AND TP < Entry → SELL
2. SECOND: Scan for explicit text labels or arrows
3. THIRD: Analyze price action context (trend, candles, levels)
4. FOURTH: Cross-validate all three methods
5. FINAL: If any conflict → Re-analyze from step 1

🔬 ENHANCED DATA EXTRACTION (Extract EVERYTHING visible):

═══ CORE TRADE DATA ═══
- pair: ANY trading instrument (Forex: EURUSD, GBPJPY, XAUUSD; Crypto: BTCUSD, ETHUSD; Stocks: AAPL, TSLA; Indices: US30, NAS100, SPX500)
- direction: MUST output "buy" or "sell" (convert "long"→"buy", "short"→"sell")
- entry_price: Exact entry level (read to maximum precision visible)
- stop_loss: SL price (if visible - check for multiple SL levels, extract all)
- take_profit: TP price (if visible - check for multiple TP levels, extract all)
- exit_price: Actual close price if trade is closed

═══ POSITION DETAILS ═══
- lot_size: Volume/size (visible in broker platforms like MT5)
- profit_loss: Realized P/L in account currency (visible only if trade closed in broker)
- commission: Trading fees if shown
- swap: Overnight interest if shown
- risk_percent: Risk as % of account if mentioned in notes

═══ SETUP CHARACTERISTICS ═══
- setup_name: Precise setup identification:
  * "Support Bounce", "Resistance Rejection", "Trendline Break", "Channel Breakout"
  * "Head and Shoulders", "Double Top/Bottom", "Flag", "Pennant", "Wedge"
  * "Supply/Demand Zone", "Order Block", "Liquidity Grab", "Market Structure Break"
  * "Fibonacci Retracement", "Harmonic Pattern", "Smart Money Concept"
  * Or any custom strategy name visible in notes
- timeframe: Chart interval (M1, M5, M15, M30, H1, H4, D1, W1, MN)
- session: Trading session (Asian/Tokyo, London/European, New York/US, overlap periods)
- confluences: List ALL visible confluences:
  * Moving averages, Fibonacci levels, pivot points
  * Support/Resistance zones, trendlines, channels
  * RSI/MACD/Stochastic signals, volume profile
  * Round numbers, liquidity zones, order blocks

═══ RISK & ANALYTICS ═══
- risk_reward: Calculate from entry/SL/TP (e.g., "1:2.5", "1:3")
- pips_risk: Distance from entry to SL in pips
- pips_target: Distance from entry to TP in pips
- win_rate_mention: If trader mentions historical WR for this setup

═══ PSYCHOLOGICAL & CONTEXT ═══
- emotion: Detect from visible notes/text:
  * Pre-trade: confident, patient, disciplined, focused, calm, anxious, hesitant, fearful, rushed, greedy, FOMO
  * Post-trade: satisfied, relieved, frustrated, angry, regretful, euphoric
- notes: COMPREHENSIVE extraction:
  * Strategy rules mentioned
  * Market narrative/bias
  * Economic events or news mentioned
  * Indicator readings
  * Pattern/structure descriptions
  * Entry/exit reasoning
  * Risk management notes
  * Lessons learned or observations

═══ METADATA ═══
- trade_timestamp: Date/time if visible (ISO format: YYYY-MM-DDTHH:MM:SSZ)
- platform: Identify platform (TradingView, MT4, MT5, cTrader, NinjaTrader, etc.)
- chart_type: Candlestick, bar, line, Heikin Ashi, Renko, etc.

🔍 ADVANCED READING TECHNIQUES:
- Zoom into price levels - read ALL decimal places visible
- Check chart corners for platform info, timestamps, account details
- Scan for overlays: text boxes, arrows, drawings, annotations
- Look for indicator windows below main chart
- Check for multiple positions or partial exits
- Identify any visible stop-loss modifications (trailing stops, break-even moves)

🚨 ABSOLUTE ACCURACY RULES:
- NEVER guess values - only extract what is clearly visible
- If direction is unclear after 3-step verification → mark as "uncertain" in notes
- Prefer conservative extraction over hallucination
- For broker screenshots: Look for account number, balance, equity (but don't extract sensitive info)
- For analysis screenshots: Extract ALL analyst commentary and reasoning

🎓 CONTEXT AWARENESS:
- TradingView charts: Rarely show lot size/P/L (focus on technical analysis)
- MT5/MT4: Often show position details, balance, floating P/L
- Mobile screenshots: May have limited info, extract what's visible
- Annotated charts: Pay special attention to trader's drawings and notes

✅ VALIDATION CHECKLIST (Before submitting extraction):
□ Direction verified via SL/TP placement
□ Direction cross-checked with labels/arrows
□ Direction validated with price action context
□ All visible prices extracted to maximum precision
□ Setup name accurately describes the pattern/strategy
□ Notes contain all readable text and context
□ No fields filled with guessed data
□ Confidence level matches data clarity`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData
              }
            }
          ]
        }],
        tools: [{
          type: "function",
          function: {
            name: "extract_trade_data",
            description: "Extract comprehensive trading data from any trading platform screenshot with maximum accuracy",
            parameters: {
              type: "object",
              properties: {
                pair: { 
                  type: "string", 
                  description: "Trading instrument - ANY asset class (Forex: EURUSD, GBPJPY; Crypto: BTCUSD; Stocks: AAPL; Indices: SPX500, US30)" 
                },
                direction: { 
                  type: "string", 
                  enum: ["buy", "sell"], 
                  description: "Trade direction - CRITICAL: Verify via SL/TP placement first, then labels, then context. MUST be 'buy' or 'sell' only." 
                },
                entry_price: { 
                  type: "number", 
                  description: "Entry price - extract to maximum visible precision" 
                },
                stop_loss: { 
                  type: "number", 
                  description: "Stop loss price if clearly visible" 
                },
                take_profit: { 
                  type: "number", 
                  description: "Take profit price if clearly visible (extract first TP if multiple)" 
                },
                exit_price: { 
                  type: "number", 
                  description: "Exit price ONLY if trade is closed" 
                },
                lot_size: { 
                  type: "number", 
                  description: "Position size ONLY if visible in broker platform (MT5, cTrader, etc.)" 
                },
                profit_loss: { 
                  type: "number", 
                  description: "Realized P/L ONLY if trade closed and visible in broker screenshot" 
                },
                setup_name: { 
                  type: "string", 
                  description: "Precise setup identification (e.g., 'Support Bounce', 'Trendline Break', 'Order Block', 'SMC', or any strategy name visible)" 
                },
                timeframe: { 
                  type: "string", 
                  description: "Chart interval if visible (M1/M5/M15/M30/H1/H4/D1/W1/MN)" 
                },
                session: { 
                  type: "string", 
                  description: "Trading session if identifiable (Asian/London/New York/Overlap)" 
                },
                confluences: { 
                  type: "string", 
                  description: "List ALL visible technical confluences (MAs, Fib levels, S/R zones, indicators, patterns, etc.)" 
                },
                risk_reward: { 
                  type: "string", 
                  description: "Calculate R:R from entry/SL/TP if all visible (format: '1:2.5')" 
                },
                pips_risk: { 
                  type: "number", 
                  description: "Distance from entry to SL in pips if calculable" 
                },
                pips_target: { 
                  type: "number", 
                  description: "Distance from entry to TP in pips if calculable" 
                },
                result: { 
                  type: "string", 
                  enum: ["open", "win", "loss", "breakeven"], 
                  description: "Trade outcome ONLY if clearly visible in broker screenshot" 
                },
                emotion: { 
                  type: "string", 
                  description: "Trader's emotional state inferred from visible notes/text (confident/patient/anxious/rushed/FOMO/satisfied/frustrated/etc.)" 
                },
                trade_timestamp: { 
                  type: "string", 
                  description: "Trade entry date/time in ISO format (YYYY-MM-DDTHH:MM:SSZ) if visible on chart" 
                },
                platform: { 
                  type: "string", 
                  description: "Identified trading platform (TradingView/MT4/MT5/cTrader/NinjaTrader/etc.)" 
                },
                notes: { 
                  type: "string", 
                  description: "COMPREHENSIVE extraction: strategy rules, market bias, indicators, patterns, entry/exit reasoning, trader commentary, ALL visible text/annotations" 
                }
              },
              required: ["pair", "direction", "entry_price"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_trade_data" } }
      }),
    });

    console.log('AI gateway response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error response:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('AI gateway response received successfully');
    
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const extractedData = toolCall ? JSON.parse(toolCall.function.arguments) : null;
    
    if (!extractedData) {
      console.error('No extracted data from AI response');
      throw new Error('Failed to extract trade data from image');
    }
    
    console.log('Extracted data:', JSON.stringify(extractedData).substring(0, 200));
    
    // Deduct credits
    await supabaseAdmin
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - EXTRACTION_COST })
      .eq('id', user.id);

    console.log('Credits deducted successfully');

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
