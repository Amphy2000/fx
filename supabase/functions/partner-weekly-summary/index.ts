import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { partner_id } = await req.json();

    if (!partner_id) {
      throw new Error('Partner ID is required');
    }

    // Verify that the requesting user has an active partnership with the partner
    const { data: partnership, error: partnershipError } = await supabaseClient
      .from('accountability_partnerships')
      .select('*')
      .or(`and(user_id.eq.${user.id},partner_id.eq.${partner_id}),and(user_id.eq.${partner_id},partner_id.eq.${user.id})`)
      .eq('status', 'active')
      .single();

    if (partnershipError || !partnership) {
      throw new Error('No active partnership found with this user');
    }

    // Get partner's profile info
    const { data: partnerProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, display_name, email')
      .eq('id', partner_id)
      .single();

    const partnerName = partnerProfile?.display_name || partnerProfile?.full_name || partnerProfile?.email?.split('@')[0] || 'Partner';

    // Get partner's active MT5 accounts
    const { data: mt5Accounts } = await supabaseClient
      .from('mt5_accounts')
      .select('id')
      .eq('user_id', partner_id)
      .eq('is_active', true);

    const accountIds = mt5Accounts?.map((a) => a.id) || [];

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Fetch partner's trades for the last 7 days
    let tradesQuery = supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', partner_id)
      .gte('entry_time', startDate.toISOString())
      .lte('entry_time', endDate.toISOString())
      .order('entry_time', { ascending: false });

    if (accountIds.length > 0) {
      tradesQuery = tradesQuery.in('mt5_account_id', accountIds);
    }

    const { data: trades, error: tradesError } = await tradesQuery;

    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
    }

    // Calculate statistics
    const totalTrades = trades?.length || 0;
    const wins = trades?.filter((t) => (t.profit_loss || 0) > 0).length || 0;
    const losses = trades?.filter((t) => (t.profit_loss || 0) < 0).length || 0;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';

    // Find most traded pair
    const pairCounts: { [key: string]: number } = {};
    trades?.forEach((t) => {
      if (t.symbol) {
        pairCounts[t.symbol] = (pairCounts[t.symbol] || 0) + 1;
      }
    });
    const mostTradedPair = Object.keys(pairCounts).length > 0
      ? Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A';

    const totalPnL = trades?.reduce((sum, t) => sum + (t.profit_loss || 0), 0) || 0;

    // Analyze emotional patterns
    const emotionCounts: { [key: string]: { count: number; wins: number; losses: number } } = {};
    trades?.forEach((t) => {
      if (t.emotion_before_trade) {
        if (!emotionCounts[t.emotion_before_trade]) {
          emotionCounts[t.emotion_before_trade] = { count: 0, wins: 0, losses: 0 };
        }
        emotionCounts[t.emotion_before_trade].count++;
        if ((t.profit_loss || 0) > 0) {
          emotionCounts[t.emotion_before_trade].wins++;
        } else if ((t.profit_loss || 0) < 0) {
          emotionCounts[t.emotion_before_trade].losses++;
        }
      }
    });

    let emotionalOverview = null;
    if (Object.keys(emotionCounts).length > 0) {
      const mostCommon = Object.entries(emotionCounts).sort((a, b) => b[1].count - a[1].count)[0][0];
      
      const lossEmotionEntry = Object.entries(emotionCounts)
        .filter(([_, data]) => data.losses > 0)
        .sort((a, b) => (b[1].losses / b[1].count) - (a[1].losses / a[1].count))[0];
      const lossEmotion = lossEmotionEntry ? lossEmotionEntry[0] : 'N/A';

      const bestEmotionEntry = Object.entries(emotionCounts)
        .filter(([_, data]) => data.wins > 0)
        .sort((a, b) => (b[1].wins / b[1].count) - (a[1].wins / a[1].count))[0];
      const bestEmotion = bestEmotionEntry ? bestEmotionEntry[0] : 'N/A';

      emotionalOverview = {
        mostCommon,
        lossEmotion,
        bestEmotion,
        insight: `${partnerName} traded most often when feeling ${mostCommon}. ${
          bestEmotion !== 'N/A' ? `Their best performance came when ${bestEmotion}.` : ''
        }`,
      };
    }

    // Generate AI summary
    let aiSummary = `${partnerName}'s Weekly Trading Summary\n\n`;
    
    if (totalTrades === 0) {
      aiSummary += `${partnerName} hasn't recorded any trades in the past 7 days. Consider checking in to see how they're doing and if they need any support with their trading journey.`;
    } else {
      aiSummary += `Performance Overview:\n`;
      aiSummary += `- Total Trades: ${totalTrades}\n`;
      aiSummary += `- Win Rate: ${winRate}%\n`;
      aiSummary += `- Wins: ${wins} | Losses: ${losses}\n`;
      aiSummary += `- Total P/L: $${totalPnL.toFixed(2)}\n`;
      aiSummary += `- Most Traded: ${mostTradedPair}\n\n`;

      if (parseFloat(winRate) >= 60) {
        aiSummary += `${partnerName} is demonstrating strong discipline with a solid win rate. Great work maintaining consistency!\n\n`;
      } else if (parseFloat(winRate) >= 45) {
        aiSummary += `${partnerName} is showing steady progress. There's room for improvement in trade selection and execution.\n\n`;
      } else {
        aiSummary += `${partnerName} is working through some challenges. This might be a good time to review their strategy and offer support.\n\n`;
      }

      if (emotionalOverview) {
        aiSummary += `Emotional Insights:\n`;
        aiSummary += `${emotionalOverview.insight}\n`;
      }
    }

    const stats = {
      totalTrades,
      winRate,
      wins,
      losses,
      mostTradedPair,
      totalPnL: totalPnL.toFixed(2),
      emotionalOverview,
    };

    return new Response(
      JSON.stringify({ 
        summary: aiSummary,
        stats,
        partnerName,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in partner-weekly-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        summary: "Unable to load partner's summary at this time.",
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
