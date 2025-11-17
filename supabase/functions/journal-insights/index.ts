import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JOURNAL_INSIGHTS_COST = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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

    // Check credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.ai_credits < JOURNAL_INSIGHTS_COST) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { periodDays = 30 } = await req.json();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch journal entries
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0])
      .order('entry_date', { ascending: true });

    // Fetch daily check-ins
    const { data: checkIns } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .gte('check_in_date', startDate.toISOString().split('T')[0])
      .lte('check_in_date', endDate.toISOString().split('T')[0])
      .order('check_in_date', { ascending: true });

    // Fetch trades with emotions
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (!trades || trades.length < 5) {
      return new Response(JSON.stringify({ 
        error: 'Not enough data',
        message: 'You need at least 5 trades in the selected period for meaningful insights.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare data summary for AI
    const dataSummary = {
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.result === 'win').length,
      losingTrades: trades.filter(t => t.result === 'loss').length,
      totalPnL: trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
      journalEntries: journalEntries?.map(j => ({
        date: j.entry_date,
        mood: j.mood,
        energy: j.energy_level,
        market: j.market_conditions,
        mindset: j.trading_mindset,
        lessons: j.lessons_learned
      })) || [],
      checkIns: checkIns?.map(c => ({
        date: c.check_in_date,
        mood: c.mood,
        confidence: c.confidence,
        stress: c.stress,
        focus: c.focus_level,
        sleep: c.sleep_hours
      })) || [],
      emotionalTrades: trades.filter(t => t.emotion_before || t.emotion_after).map(t => ({
        date: new Date(t.created_at).toISOString().split('T')[0],
        emotionBefore: t.emotion_before,
        emotionAfter: t.emotion_after,
        result: t.result,
        profitLoss: t.profit_loss,
        pair: t.pair
      }))
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'system',
          content: `You are an expert trading psychologist. Analyze the correlation between emotional states and trading performance. 
          Identify patterns where certain emotions or mental states correlate with better or worse trading outcomes.
          Provide actionable insights and recommendations. Be specific and data-driven.
          
          Return your analysis as a JSON object with this structure:
          {
            "emotionalPatterns": {
              "positiveStates": ["state that correlates with wins"],
              "negativeStates": ["state that correlates with losses"],
              "neutral": ["states with no clear pattern"]
            },
            "performanceCorrelation": {
              "bestMoods": ["moods when trading best"],
              "worstMoods": ["moods when trading worst"],
              "optimalConditions": ["ideal conditions for trading"]
            },
            "keyInsights": ["insight 1", "insight 2", "insight 3"],
            "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
            "confidenceScore": 85
          }`
        }, {
          role: 'user',
          content: `Analyze this trader's emotional and performance data over the past ${periodDays} days:\n\n${JSON.stringify(dataSummary, null, 2)}`
        }],
        temperature: 0.3
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const analysisText = aiResult.choices?.[0]?.message?.content;
    
    let analysis;
    try {
      // Try to parse JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(analysisText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback to basic structure
      analysis = {
        emotionalPatterns: { positiveStates: [], negativeStates: [], neutral: [] },
        performanceCorrelation: { bestMoods: [], worstMoods: [], optimalConditions: [] },
        keyInsights: [analysisText.substring(0, 200)],
        recommendations: ['Keep tracking your emotions and trading performance'],
        confidenceScore: 50
      };
    }

    // Store insights in database
    const { error: insertError } = await supabase
      .from('journal_insights')
      .insert({
        user_id: user.id,
        analysis_period_start: startDate.toISOString().split('T')[0],
        analysis_period_end: endDate.toISOString().split('T')[0],
        emotional_patterns: analysis.emotionalPatterns,
        performance_correlation: analysis.performanceCorrelation,
        key_insights: analysis.keyInsights,
        recommendations: analysis.recommendations,
        confidence_score: analysis.confidenceScore
      });

    if (insertError) {
      console.error('Failed to store insights:', insertError);
    }

    // Deduct credits
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    await supabaseAdmin
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - JOURNAL_INSIGHTS_COST })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ 
        insights: analysis,
        creditsRemaining: profile.ai_credits - JOURNAL_INSIGHTS_COST
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Journal insights error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
