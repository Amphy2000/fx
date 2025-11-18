import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { command } = await req.json();
    if (!command) {
      throw new Error('No command provided');
    }

    console.log('Processing voice command:', command);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Parse command using Lovable AI with tool calling
    const parseResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'system',
          content: `You are a voice command parser for a trading journal app. Parse user commands and determine the action and parameters.`
        }, {
          role: 'user',
          content: command
        }],
        tools: [{
          type: "function",
          function: {
            name: "execute_trade_command",
            description: "Execute a trade management command",
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: ["delete_last", "show_wins", "show_losses", "count_trades", "show_recent", "show_stats"],
                  description: "The action to perform"
                },
                timeframe: {
                  type: "string",
                  enum: ["today", "this_week", "this_month", "all"],
                  description: "Time period for the query"
                },
                result_filter: {
                  type: "string",
                  enum: ["win", "loss", "breakeven", "all"],
                  description: "Filter by trade result"
                }
              },
              required: ["action"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "execute_trade_command" } }
      })
    });

    if (!parseResponse.ok) {
      throw new Error(`AI parsing failed: ${await parseResponse.text()}`);
    }

    const parseResult = await parseResponse.json();
    const toolCall = parseResult.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "I couldn't understand that command. Try 'delete last trade' or 'show my wins this week'" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const params = JSON.parse(toolCall.function.arguments);
    const { action, timeframe = 'all', result_filter = 'all' } = params;

    console.log('Parsed command:', { action, timeframe, result_filter });

    // Calculate date range
    const now = new Date();
    let startDate = new Date('2000-01-01');
    
    if (timeframe === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (timeframe === 'this_week') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now.setDate(now.getDate() - dayOfWeek));
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Execute action
    let result: any = {};

    switch (action) {
      case 'delete_last': {
        const { data: lastTrade } = await supabase
          .from('trades')
          .select('id, pair, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!lastTrade) {
          return new Response(JSON.stringify({
            success: false,
            message: "You don't have any trades to delete."
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error: deleteError } = await supabase
          .from('trades')
          .delete()
          .eq('id', lastTrade.id);

        if (deleteError) throw deleteError;

        result = {
          success: true,
          message: `Deleted your last trade: ${lastTrade.pair}`,
          action: 'delete',
          tradeId: lastTrade.id
        };
        break;
      }

      case 'show_wins':
      case 'show_losses': {
        const resultType = action === 'show_wins' ? 'win' : 'loss';
        const { data: trades, count } = await supabase
          .from('trades')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('result', resultType)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        const totalPL = trades?.reduce((sum, t) => sum + (t.profit_loss || 0), 0) || 0;
        
        result = {
          success: true,
          message: `Found ${count} ${resultType}${count !== 1 ? 's' : ''} ${timeframe !== 'all' ? timeframe : 'in total'}. Total P/L: ${totalPL.toFixed(2)}`,
          data: { trades, count, totalPL },
          action: 'show'
        };
        break;
      }

      case 'count_trades': {
        let query = supabase
          .from('trades')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString());

        if (result_filter !== 'all') {
          query = query.eq('result', result_filter);
        }

        const { count, data: trades } = await query;
        const totalPL = trades?.reduce((sum, t) => sum + (t.profit_loss || 0), 0) || 0;

        result = {
          success: true,
          message: `You have ${count} trade${count !== 1 ? 's' : ''} ${timeframe !== 'all' ? timeframe : 'in total'}. Total P/L: ${totalPL.toFixed(2)}`,
          data: { count, totalPL },
          action: 'count'
        };
        break;
      }

      case 'show_recent': {
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        result = {
          success: true,
          message: `Here are your ${trades?.length || 0} most recent trades ${timeframe !== 'all' ? timeframe : ''}`,
          data: { trades },
          action: 'show'
        };
        break;
      }

      case 'show_stats': {
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString());

        const wins = trades?.filter(t => t.result === 'win').length || 0;
        const losses = trades?.filter(t => t.result === 'loss').length || 0;
        const winRate = trades?.length ? ((wins / trades.length) * 100).toFixed(1) : '0';
        const totalPL = trades?.reduce((sum, t) => sum + (t.profit_loss || 0), 0) || 0;

        result = {
          success: true,
          message: `Stats ${timeframe !== 'all' ? timeframe : ''}: ${trades?.length || 0} trades, ${winRate}% win rate, ${wins}W-${losses}L. P/L: ${totalPL.toFixed(2)}`,
          data: { total: trades?.length, wins, losses, winRate, totalPL },
          action: 'stats'
        };
        break;
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          message: "Unknown action"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Voice command error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
