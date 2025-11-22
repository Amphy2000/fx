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
    
    // Create authenticated client with the user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits (cost: 10 credits for vision)
    const { data: profile, error: profileError } = await supabaseClient
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
        messages: [
          { 
            role: "system", 
            content: "You are a forex trading screenshot analyzer. Extract all visible trading data." 
          },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Analyze this forex trading screenshot and extract all visible data."
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_trade_data",
            description: "Extract trading data from screenshot",
            parameters: {
              type: "object",
              properties: {
                pair: { type: "string", description: "Currency pair (e.g., EUR/USD)" },
                direction: { type: "string", enum: ["long", "short"] },
                entry_price: { type: "number" },
                exit_price: { type: "number", description: "Exit price if visible, null if still open" },
                stop_loss: { type: "number", description: "Stop loss if visible" },
                take_profit: { type: "number", description: "Take profit if visible" },
                lot_size: { type: "number", description: "Trade volume/lot size" },
                profit_loss: { type: "number", description: "P&L if visible" },
                timestamp: { type: "string", description: "Trade timestamp if visible" }
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
    
    // Deduct credits using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
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
