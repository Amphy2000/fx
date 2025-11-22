import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

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
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check AI credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();

    if (!profile || profile.ai_credits < 2) {
      return new Response(
        JSON.stringify({ error: 'Insufficient AI credits. You need 2 credits for check-in analysis.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { checkInData } = await req.json();

    // Get historical check-ins (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: historicalCheckins } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .gte('check_in_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('check_in_date', { ascending: false });

    // Get trades with mental state data
    const { data: trades } = await supabase
      .from('trades')
      .select('result, profit_loss, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get today's check-ins to match with trades
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: todayCheckin } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('check_in_date', new Date().toISOString().split('T')[0])
      .single();

    // Calculate correlations
    const calculateCorrelations = () => {
      if (!historicalCheckins || !trades || historicalCheckins.length === 0 || trades.length === 0) {
        return null;
      }

      // Match check-ins with trades by date
      const tradesByDate = new Map<string, any[]>();
      trades.forEach((trade: any) => {
        const date = trade.created_at.split('T')[0];
        if (!tradesByDate.has(date)) {
          tradesByDate.set(date, []);
        }
        tradesByDate.get(date)!.push(trade);
      });

      // Match check-ins with trades
      const matched: Array<any> = [];
      historicalCheckins.forEach((checkin: any) => {
        const dayTrades = tradesByDate.get(checkin.check_in_date) || [];
        if (dayTrades.length > 0) {
          const winTrades = dayTrades.filter((t: any) => t.result === 'win').length;
          const totalTrades = dayTrades.length;
          const totalPnl = dayTrades.reduce((sum: number, t: any) => sum + (t.profit_loss || 0), 0);
          
          matched.push({
            ...checkin,
            win_rate: totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0,
            total_pnl: totalPnl,
            trade_count: totalTrades
          });
        }
      });

      if (matched.length === 0) return null;

      // Calculate average win rates by conditions
      const byConfidence = {
        high: matched.filter(m => m.confidence >= 7),
        medium: matched.filter(m => m.confidence >= 4 && m.confidence < 7),
        low: matched.filter(m => m.confidence < 4)
      };

      const bySleep = {
        good: matched.filter(m => m.sleep_hours >= 7),
        poor: matched.filter(m => m.sleep_hours < 6)
      };

      const byStress = {
        low: matched.filter(m => m.stress <= 4),
        high: matched.filter(m => m.stress >= 7)
      };

      return {
        confidenceCorrelation: {
          high: byConfidence.high.length > 0 ? byConfidence.high.reduce((sum, m) => sum + m.win_rate, 0) / byConfidence.high.length : null,
          medium: byConfidence.medium.length > 0 ? byConfidence.medium.reduce((sum, m) => sum + m.win_rate, 0) / byConfidence.medium.length : null,
          low: byConfidence.low.length > 0 ? byConfidence.low.reduce((sum, m) => sum + m.win_rate, 0) / byConfidence.low.length : null,
        },
        sleepCorrelation: {
          good: bySleep.good.length > 0 ? bySleep.good.reduce((sum, m) => sum + m.win_rate, 0) / bySleep.good.length : null,
          poor: bySleep.poor.length > 0 ? bySleep.poor.reduce((sum, m) => sum + m.win_rate, 0) / bySleep.poor.length : null,
        },
        stressCorrelation: {
          low: byStress.low.length > 0 ? byStress.low.reduce((sum, m) => sum + m.win_rate, 0) / byStress.low.length : null,
          high: byStress.high.length > 0 ? byStress.high.reduce((sum, m) => sum + m.win_rate, 0) / byStress.high.length : null,
        }
      };
    };

    const correlations = calculateCorrelations();

    // Prepare AI prompt
    const prompt = `Analyze this trader's daily mental state check-in and provide personalized psychological insights based on their trading history.

TODAY'S CHECK-IN:
- Mood: ${checkInData.mood}
- Confidence: ${checkInData.confidence}/10
- Stress: ${checkInData.stress}/10
- Sleep: ${checkInData.sleep_hours} hours
- Focus: ${checkInData.focus_level}/10
${checkInData.note ? `- Notes: ${checkInData.note}` : ''}

HISTORICAL PERFORMANCE CORRELATIONS:
${correlations ? `
- High confidence (7-10): ${correlations.confidenceCorrelation.high ? Math.round(correlations.confidenceCorrelation.high) + '% win rate' : 'No data'}
- Medium confidence (4-6): ${correlations.confidenceCorrelation.medium ? Math.round(correlations.confidenceCorrelation.medium) + '% win rate' : 'No data'}
- Low confidence (1-3): ${correlations.confidenceCorrelation.low ? Math.round(correlations.confidenceCorrelation.low) + '% win rate' : 'No data'}

- Good sleep (7+ hrs): ${correlations.sleepCorrelation.good ? Math.round(correlations.sleepCorrelation.good) + '% win rate' : 'No data'}
- Poor sleep (<6 hrs): ${correlations.sleepCorrelation.poor ? Math.round(correlations.sleepCorrelation.poor) + '% win rate' : 'No data'}

- Low stress (≤4): ${correlations.stressCorrelation.low ? Math.round(correlations.stressCorrelation.low) + '% win rate' : 'No data'}
- High stress (≥7): ${correlations.stressCorrelation.high ? Math.round(correlations.stressCorrelation.high) + '% win rate' : 'No data'}
` : 'Not enough historical data yet to show correlations.'}

RECENT TRADING DAYS: ${historicalCheckins?.length || 0} check-ins, ${trades?.length || 0} trades

Provide a concise, actionable 2-3 sentence insight that:
1. Highlights specific correlations from THEIR data (not generic advice)
2. Gives concrete trading recommendations for today
3. Is encouraging but honest

Do not use generic advice. Use their actual numbers and patterns.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional trading psychology coach. Provide personalized, data-driven insights.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const insight = aiData.choices[0]?.message?.content || 'Unable to generate insight at this time.';

    // Deduct credits
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabaseAdmin
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - 2 })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        insight,
        correlations,
        credits_remaining: profile.ai_credits - 2
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});