import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { callGemini, generateFallbackResponse } from "../_shared/gemini-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('analyze-trade-patterns: Request received');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('analyze-trade-patterns: No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { 
        headers: { 
          Authorization: authHeader 
        } 
      }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('analyze-trade-patterns: Auth error', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    console.log('analyze-trade-patterns: User authenticated:', user.id);

    // Get user's subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(profile.subscription_tier);

    console.log('analyze-trade-patterns: Parsing request body...');
    let tradeIds: string[] = [];
    try {
      const body = await req.json();
      tradeIds = body?.tradeIds ?? [];
    } catch (e) {
      console.error('analyze-trade-patterns: Failed to parse JSON body', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    console.log('analyze-trade-patterns: tradeIds received:', Array.isArray(tradeIds) ? tradeIds.length : 'invalid');
    
    if (!tradeIds || !Array.isArray(tradeIds) || tradeIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No trade IDs provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Fetch trades to analyze (chunked to avoid URL length limits)
    console.log('analyze-trade-patterns: Fetching trades for user in chunks');

    const chunk = <T,>(arr: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const idChunks = chunk(tradeIds, 100);
    const tradesCombined: any[] = [];

    for (const [idx, idChunk] of idChunks.entries()) {
      console.log(`analyze-trade-patterns: fetching chunk ${idx + 1}/${idChunks.length} (size ${idChunk.length})`);
      const { data: t, error: te } = await supabase
        .from('trades')
        .select('*')
        .in('id', idChunk)
        .eq('user_id', user.id);
      if (te) {
        console.error('analyze-trade-patterns: trades chunk query error', te);
        throw te;
      }
      if (t?.length) tradesCombined.push(...t);
    }

    console.log('analyze-trade-patterns: total trades fetched:', tradesCombined.length);

    if (tradesCombined.length === 0) {
      return new Response(JSON.stringify({ error: 'No trades found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    const trades = tradesCombined;
    const insights = [];

    // Analyze each trade with Gemini
    for (const trade of trades) {
      try {
        // Check if insight already exists
        const { data: existing } = await supabase
          .from('trade_insights')
          .select('id')
          .eq('trade_id', trade.id)
          .maybeSingle();

        if (existing) {
          console.log(`Insight already exists for trade ${trade.id}`);
          continue;
        }

        const prompt = `Analyze this forex trade and provide structured insights:

Trade Details:
- Pair: ${trade.pair}
- Direction: ${trade.direction}
- Entry: ${trade.entry_price}
- Exit: ${trade.exit_price || 'Still open'}
- Stop Loss: ${trade.stop_loss}
- Take Profit: ${trade.take_profit}
- Result: ${trade.result || 'pending'}
- P/L: ${trade.profit_loss || 'N/A'}
- Emotion Before: ${trade.emotion_before || 'Not recorded'}
- Notes: ${trade.notes || 'None'}

Provide analysis in this format:
PATTERN: [one word: breakout, reversal, pullback, range, scalp, or swing]
BEHAVIOR: [one word: perfect_timing, chased_entry, held_too_long, emotional_exit, or revenge_trade]
GRADE: [A+, A, B, C, D, or F]
CONFIDENCE: [0-100]
COMMENT: [One sentence about execution quality]
SUMMARY: [2-3 sentences analyzing the trade]
RECOMMENDATIONS: [One specific actionable recommendation]`;

        console.log(`Calling Gemini for trade ${trade.id}`);
        
        let analysis: string;
        try {
          const result = await callGemini({
            supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
            supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            userId: user.id,
            prompt,
            systemPrompt: 'You are an expert forex trading analyst. Provide concise, actionable trade analysis.',
            cacheKey: `trade-pattern-${trade.id}`,
            cacheTtlMinutes: 1440, // 24 hours
            skipUsageCheck: isPremium,
          });
          analysis = result.text;
        } catch (error) {
          console.error(`Gemini analysis failed for trade ${trade.id}:`, error);
          continue;
        }

        // Parse AI response
        const parseField = (field: string) => {
          const match = analysis.match(new RegExp(`${field}:\\s*(.+?)(?=\\n|$)`, 'i'));
          return match ? match[1].trim() : null;
        };

        const patternType = parseField('PATTERN')?.toLowerCase();
        const behaviorLabel = parseField('BEHAVIOR')?.toLowerCase();
        const grade = parseField('GRADE');
        const confidence = parseInt(parseField('CONFIDENCE') || '75');
        const comment = parseField('COMMENT');
        const summary = parseField('SUMMARY');
        const recommendations = parseField('RECOMMENDATIONS');

        // Store insight
        const { error: insertError } = await supabase
          .from('trade_insights')
          .insert({
            trade_id: trade.id,
            user_id: user.id,
            pattern_type: patternType,
            behavior_label: behaviorLabel,
            behavior_comment: comment,
            confidence_score: confidence,
            execution_grade: grade,
            ai_summary: summary,
            recommendations: recommendations
          });

        if (insertError) {
          console.error(`Failed to insert insight for trade ${trade.id}:`, insertError);
        } else {
          insights.push({
            trade_id: trade.id,
            pattern: patternType,
            behavior: behaviorLabel,
            grade: grade,
            confidence: confidence
          });
        }
      } catch (error) {
        console.error(`Error analyzing trade ${trade.id}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analyzed: insights.length,
      insights: insights
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('analyze-trade-patterns error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
    console.error('Error details:', errorDetails);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorDetails
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
