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
            name: "execute_app_command",
            description: "Execute any app command including navigation, trade management, journal entries, analytics, and settings",
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: [
                    "navigate", "delete_last", "show_wins", "show_losses", "count_trades", 
                    "show_recent", "show_stats", "mark_last_as", "close_trade", "add_trade",
                    "add_journal", "show_journal", "show_analytics", "export_data", "show_targets",
                    "show_achievements", "show_leaderboard", "show_streaks"
                  ],
                  description: "The action to perform"
                },
                destination: {
                  type: "string",
                  enum: [
                    "dashboard", "journal", "trades", "analytics", "ai-coach", "targets", 
                    "achievements", "leaderboard", "streaks", "settings", "pricing", "integrations"
                  ],
                  description: "Navigation destination (for navigate action)"
                },
                timeframe: {
                  type: "string",
                  enum: ["today", "this_week", "this_month", "all"],
                  description: "Time period for queries"
                },
                result_filter: {
                  type: "string",
                  enum: ["win", "loss", "breakeven", "all"],
                  description: "Filter by trade result"
                },
                result_value: {
                  type: "string",
                  enum: ["win", "loss", "breakeven"],
                  description: "Result to mark the trade as"
                },
                profit_amount: {
                  type: "number",
                  description: "Profit/loss amount"
                },
                exit_price: {
                  type: "number",
                  description: "Exit price"
                },
                trade_data: {
                  type: "object",
                  description: "Trade data for adding new trade"
                },
                journal_data: {
                  type: "object",
                  description: "Journal entry data"
                },
                export_format: {
                  type: "string",
                  enum: ["json", "csv"],
                  description: "Export format"
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
        message: "I couldn't understand that command. Try: 'go to journal', 'show my stats', 'add a trade', 'what's my streak?', or 'export data'" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const params = JSON.parse(toolCall.function.arguments);
    const { action, timeframe = 'all', result_filter = 'all', destination, export_format } = params;

    console.log('Parsed command:', params);

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

      case 'mark_last_as': {
        const { result_value } = params;
        if (!result_value) {
          return new Response(JSON.stringify({
            success: false,
            message: "Please specify the result (win, loss, or breakeven)"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: lastTrade } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!lastTrade) {
          return new Response(JSON.stringify({
            success: false,
            message: "You don't have any trades to update."
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error: updateError } = await supabase
          .from('trades')
          .update({ result: result_value })
          .eq('id', lastTrade.id);

        if (updateError) throw updateError;

        result = {
          success: true,
          message: `Marked ${lastTrade.pair} as ${result_value}`,
          action: 'update',
          tradeId: lastTrade.id,
          data: { result: result_value }
        };
        break;
      }

      case 'close_trade': {
        const { profit_amount, exit_price } = params;
        if (profit_amount === undefined) {
          return new Response(JSON.stringify({
            success: false,
            message: "Please specify the profit/loss amount"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: lastOpenTrade } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('result', 'open')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!lastOpenTrade) {
          return new Response(JSON.stringify({
            success: false,
            message: "You don't have any open trades to close."
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const updateData: any = {
          profit_loss: profit_amount,
          result: profit_amount > 0 ? 'win' : profit_amount < 0 ? 'loss' : 'breakeven',
          close_time: new Date().toISOString()
        };

        if (exit_price) {
          updateData.exit_price = exit_price;
        }

        const { error: updateError } = await supabase
          .from('trades')
          .update(updateData)
          .eq('id', lastOpenTrade.id);

        if (updateError) throw updateError;

        result = {
          success: true,
          message: `Closed ${lastOpenTrade.pair} with ${profit_amount > 0 ? 'profit' : 'loss'} of ${Math.abs(profit_amount).toFixed(2)}`,
          action: 'close',
          tradeId: lastOpenTrade.id,
          data: updateData
        };
        break;
      }

      case 'navigate': {
        if (!destination) {
          return new Response(JSON.stringify({
            success: false,
            message: "Please specify where you want to go"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        result = {
          success: true,
          message: `Navigating to ${destination}`,
          action: 'navigate',
          data: { destination }
        };
        break;
      }

      case 'add_trade': {
        const { trade_data } = params;
        if (!trade_data || !trade_data.pair || !trade_data.direction || !trade_data.entry_price) {
          return new Response(JSON.stringify({
            success: false,
            message: "Please provide trade details (pair, direction, entry price)"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error: insertError } = await supabase
          .from('trades')
          .insert({
            user_id: user.id,
            ...trade_data
          });

        if (insertError) throw insertError;

        result = {
          success: true,
          message: `Added ${trade_data.direction} trade for ${trade_data.pair}`,
          action: 'add_trade'
        };
        break;
      }

      case 'add_journal': {
        const { journal_data } = params;
        if (!journal_data || !journal_data.mood) {
          return new Response(JSON.stringify({
            success: false,
            message: "Please provide at least your mood for the journal entry"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error: insertError } = await supabase
          .from('journal_entries')
          .insert({
            user_id: user.id,
            entry_date: new Date().toISOString().split('T')[0],
            ...journal_data
          });

        if (insertError) throw insertError;

        result = {
          success: true,
          message: `Journal entry added with ${journal_data.mood} mood`,
          action: 'add_journal'
        };
        break;
      }

      case 'show_journal': {
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('entry_date', startDate.toISOString().split('T')[0])
          .order('entry_date', { ascending: false })
          .limit(5);

        result = {
          success: true,
          message: `Found ${entries?.length || 0} recent journal entries`,
          data: { entries },
          action: 'show'
        };
        break;
      }

      case 'show_analytics': {
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString());

        const pairs = [...new Set(trades?.map(t => t.pair))];
        const winRate = trades?.length 
          ? ((trades.filter(t => t.result === 'win').length / trades.length) * 100).toFixed(1)
          : '0';

        result = {
          success: true,
          message: `Analytics ${timeframe !== 'all' ? timeframe : ''}: ${trades?.length || 0} trades across ${pairs.length} pairs. Win rate: ${winRate}%`,
          data: { trades, pairs, winRate },
          action: 'analytics'
        };
        break;
      }

      case 'export_data': {
        result = {
          success: true,
          message: `Preparing ${export_format || 'json'} export`,
          action: 'export',
          data: { format: export_format || 'json' }
        };
        break;
      }

      case 'show_targets': {
        const { data: targets } = await supabase
          .from('targets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        result = {
          success: true,
          message: `You have ${targets?.length || 0} active target${targets?.length !== 1 ? 's' : ''}`,
          data: { targets },
          action: 'show'
        };
        break;
      }

      case 'show_achievements': {
        const { data: achievements } = await supabase
          .from('achievements')
          .select('*')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false });

        result = {
          success: true,
          message: `You've earned ${achievements?.length || 0} achievement${achievements?.length !== 1 ? 's' : ''}`,
          data: { achievements },
          action: 'show'
        };
        break;
      }

      case 'show_streaks': {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_streak, longest_streak')
          .eq('id', user.id)
          .single();

        result = {
          success: true,
          message: `Current streak: ${profile?.current_streak || 0} days. Best: ${profile?.longest_streak || 0} days`,
          data: profile,
          action: 'show'
        };
        break;
      }

      case 'show_leaderboard': {
        const { data: profiles } = await supabase
          .from('leaderboard_profiles')
          .select('*')
          .eq('is_public', true)
          .order('win_rate', { ascending: false })
          .limit(5);

        result = {
          success: true,
          message: `Top ${profiles?.length || 0} traders on the leaderboard`,
          data: { profiles },
          action: 'show'
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
