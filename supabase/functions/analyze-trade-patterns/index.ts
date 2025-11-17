import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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

    const { tradeIds } = await req.json();
    
    if (!tradeIds || !Array.isArray(tradeIds) || tradeIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No trade IDs provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Fetch trades to analyze
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .in('id', tradeIds)
      .eq('user_id', user.id);

    if (tradesError) throw tradesError;
    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ error: 'No trades found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const insights = [];

    // Analyze each trade with AI
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

        const aiPayload = {
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert forex trading analyst. Provide concise, actionable trade analysis.' },
            { role: 'user', content: prompt }
          ],
        };
        
        console.log(`Calling AI for trade ${trade.id} with model: ${aiPayload.model}`);
        
        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${lovableApiKey}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(aiPayload),
        });

        if (!aiResp.ok) {
          const errorText = await aiResp.text();
          console.error(`AI analysis failed for trade ${trade.id}:`, aiResp.status, errorText);
          continue;
        }

        const aiData = await aiResp.json();
        const analysis = aiData.choices?.[0]?.message?.content || '';

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
