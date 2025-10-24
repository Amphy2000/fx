import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users with Telegram enabled
    const { data: users } = await supabaseClient
      .from('profiles')
      .select('id, telegram_chat_id, full_name')
      .eq('telegram_notifications_enabled', true)
      .not('telegram_chat_id', 'is', null);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users with Telegram enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Send summary to each user
    for (const user of users) {
      try {
        // Get user's trades from last 7 days
        const { data: trades } = await supabaseClient
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', oneWeekAgo.toISOString())
          .order('created_at', { ascending: false });

        if (!trades || trades.length === 0) {
          continue; // Skip if no trades
        }

        const wins = trades.filter(t => t.result === 'win').length;
        const losses = trades.filter(t => t.result === 'loss').length;
        const totalTrades = trades.length;
        const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

        // Calculate most traded pair
        const pairCount: Record<string, number> = {};
        trades.forEach(t => {
          pairCount[t.pair] = (pairCount[t.pair] || 0) + 1;
        });
        const mostTradedPair = Object.entries(pairCount).sort((a, b) => b[1] - a[1])[0];

        // Emotion patterns
        const emotions = trades.map(t => t.emotion_before).filter(Boolean);
        const commonEmotion = emotions.length > 0 ? emotions[0] : 'N/A';

        let message = `📊 *Weekly Trading Summary*\n\n`;
        message += `Hello ${user.full_name || 'Trader'}! Here's your performance for the past week:\n\n`;
        message += `📈 *Statistics*\n`;
        message += `• Total Trades: ${totalTrades}\n`;
        message += `• Win Rate: ${winRate}%\n`;
        message += `• Wins: ${wins} | Losses: ${losses}\n\n`;
        
        if (mostTradedPair) {
          message += `🎯 Most Traded: ${mostTradedPair[0]} (${mostTradedPair[1]} trades)\n\n`;
        }

        message += `💡 *Insight*\n`;
        if (winRate >= 60) {
          message += `Great work! Your win rate is solid. Keep following your strategy.\n`;
        } else if (winRate >= 40) {
          message += `You're doing okay, but there's room for improvement. Review your losing trades.\n`;
        } else {
          message += `Your win rate needs attention. Consider taking a break and reviewing your strategy.\n`;
        }

        message += `\nKeep logging your trades to track your progress! 📱`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: user.telegram_chat_id,
            text: message,
            parse_mode: "Markdown"
          })
        });

        console.log(`Sent weekly summary to user ${user.id}`);
      } catch (error) {
        console.error(`Error sending summary to user ${user.id}:`, error);
      }
    }

    return new Response(JSON.stringify({ sent: users.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in telegram-weekly-summary:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
