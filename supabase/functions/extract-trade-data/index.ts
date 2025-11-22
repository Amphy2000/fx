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
              text: `You are a professional trading chart analyst with expertise in identifying trade directions. Extract ALL visible trading information from this screenshot with extreme precision.

🎯 CRITICAL DIRECTION DETECTION RULES:
LONG/BUY Indicators:
- Green/bullish candles dominating
- Entry level is BELOW the current price
- Upward arrows or "BUY" text visible
- Support level entries
- The word "Long" or "Buy" visible
- Bullish chart patterns

SHORT/SELL Indicators:
- Red/bearish candles dominating
- Entry level is ABOVE the current price
- Downward arrows or "SELL" text visible
- Resistance level entries
- The word "Short" or "Sell" visible
- Bearish chart patterns

⚠️ MAPPING: "Long" → "buy" | "Short" → "sell"

📊 EXTRACTION REQUIREMENTS (extract ALL visible data):
1. pair: Currency pair (e.g., "EURUSD", "GBPJPY")
2. direction: MUST be "buy" or "sell" (NOT "long" or "short")
3. entry_price: Exact entry price number
4. stop_loss: Stop loss price (if visible)
5. take_profit: Take profit price (if visible)
6. exit_price: Exit price if closed trade (if visible)
7. lot_size: Position size in lots/volume (if visible)
8. profit_loss: Profit or loss amount (if visible)
9. setup_name: Trading setup type (e.g., "Support Bounce", "Breakout", "Trendline Break", "Supply/Demand", "Moving Average Cross")
10. timeframe: Chart timeframe (e.g., "1H", "4H", "Daily", "15M", "1M")
11. session: Trading session (e.g., "London", "New York", "Asian", "Sydney", "London/NY Overlap")
12. risk_reward: Risk-reward ratio if calculable (e.g., "1:3", "1:2")
13. trade_timestamp: Date/time of trade if visible (ISO format: YYYY-MM-DDTHH:mm:ss)
14. notes: Any additional context - indicators, confluences, market conditions, patterns observed

🎯 ACCURACY RULES:
- Double-check direction by analyzing multiple indicators
- Be precise with all numerical values
- If data is not clearly visible, omit the field
- Never guess - accuracy over completeness
- Look for text labels, arrows, colors to confirm direction`
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
                direction: { type: "string", enum: ["buy", "sell"], description: "Trade direction - MUST be buy or sell only" },
                entry_price: { type: "number", description: "Entry price" },
                stop_loss: { type: "number", description: "Stop loss price" },
                take_profit: { type: "number", description: "Take profit price" },
                exit_price: { type: "number", description: "Exit price if trade is closed" },
                lot_size: { type: "number", description: "Position size in lots" },
                profit_loss: { type: "number", description: "Profit or loss amount" },
                setup_name: { type: "string", description: "Trading setup name/type" },
                timeframe: { type: "string", description: "Chart timeframe" },
                session: { type: "string", description: "Trading session" },
                risk_reward: { type: "string", description: "Risk-reward ratio (e.g., 1:3)" },
                trade_timestamp: { type: "string", description: "Trade date/time in ISO format" },
                notes: { type: "string", description: "Additional context and observations" }
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
