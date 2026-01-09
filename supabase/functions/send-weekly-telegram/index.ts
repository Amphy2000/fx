import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { callGemini, generateFallbackResponse } from "../_shared/gemini-client.ts";

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

    // Get users who have consented and enabled Telegram
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id, telegram_chat_id, full_name, subscription_tier')
      .eq('telegram_notifications_enabled', true)
      .eq('data_collection_consent', true)
      .not('telegram_chat_id', 'is', null);

    if (usersError) throw usersError;

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    let summariesSent = 0;

    for (const user of users || []) {
      try {
        // Get current week trades
        const currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);

        const { data: currentTrades } = await supabaseClient
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', currentWeekStart.toISOString());

        // Get previous week trades for comparison
        const previousWeekStart = new Date(currentWeekStart);
        previousWeekStart.setDate(previousWeekStart.getDate() - 7);

        const { data: previousTrades } = await supabaseClient
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', previousWeekStart.toISOString())
          .lt('created_at', currentWeekStart.toISOString());

        if (!currentTrades || currentTrades.length === 0) continue;

        // Calculate stats
        const currentWins = currentTrades.filter(t => t.result === 'win').length;
        const currentWinRate = (currentWins / currentTrades.length) * 100;

        const previousWins = previousTrades?.filter(t => t.result === 'win').length || 0;
        const previousWinRate = previousTrades && previousTrades.length > 0
          ? (previousWins / previousTrades.length) * 100
          : 0;

        const winRateDiff = currentWinRate - previousWinRate;
        const trendEmoji = winRateDiff > 5 ? '📈' : winRateDiff < -5 ? '📉' : '➡️';

        // Get most traded pair
        const pairCounts: Record<string, number> = {};
        currentTrades.forEach(t => {
          pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1;
        });
        const mostTradedPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        const isPremium = user.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(user.subscription_tier);

        // Generate AI insight using Gemini
        let insight = 'Keep up the great work!';
        try {
          const result = await callGemini({
            supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
            supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            userId: user.id,
            prompt: `Generate a brief (2-3 sentences) personalized weekly trading insight for a trader with these stats:
- This week: ${currentTrades.length} trades, ${currentWinRate.toFixed(1)}% win rate
- Last week: ${previousTrades?.length || 0} trades, ${previousWinRate.toFixed(1)}% win rate
- Change: ${winRateDiff > 0 ? '+' : ''}${winRateDiff.toFixed(1)}%
- Most traded: ${mostTradedPair}

Be encouraging and specific. Mention the trend and give one actionable tip.`,
            systemPrompt: "You're a supportive trading mentor. Be brief, encouraging, and specific.",
            cacheKey: `telegram-${user.id}-${currentWinRate.toFixed(0)}`,
            cacheTtlMinutes: 1440, // 24 hours
            skipUsageCheck: isPremium,
          });
          insight = result.text;
        } catch (error) {
          console.error('Gemini call failed:', error);
          insight = generateFallbackResponse('weekly trading summary');
        }

        // Format message
        const message = `📊 *Weekly Trading Summary*

${trendEmoji} *This Week*
• Trades: ${currentTrades.length}
• Win Rate: ${currentWinRate.toFixed(1)}%
• Wins: ${currentWins} | Losses: ${currentTrades.length - currentWins}
• Top Pair: ${mostTradedPair}

${winRateDiff !== 0 ? `*Trend:* ${winRateDiff > 0 ? '+' : ''}${winRateDiff.toFixed(1)}% from last week\n\n` : ''}💡 *Insight*
${insight}

Keep journaling your trades! 📝`;

        // Send to Telegram
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: user.telegram_chat_id,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        summariesSent++;
      } catch (error) {
        console.error(`Error sending summary to user ${user.id}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      summariesSent 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-weekly-telegram:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
