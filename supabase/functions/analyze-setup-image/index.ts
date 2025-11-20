import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANALYSIS_COST = 5;

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

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to check credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!profile || profile.ai_credits < ANALYSIS_COST) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits',
        required: ANALYSIS_COST,
        available: profile?.ai_credits || 0
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { image } = await req.json();
    if (!image) {
      throw new Error('No image provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing setup image with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a professional trading analyst with 15+ years of experience. Analyze this trading chart with extreme precision.

**CRITICAL INSTRUCTIONS:**
- Study the chart CAREFULLY before responding
- Identify ALL visible price levels (entry, stop loss, take profit) with EXACT precision
- Calculate risk-reward ratios ACCURATELY by measuring actual pip distances
- Show your calculation work: "Entry: X, SL: Y, TP: Z → Risk: |X-Y| pips, Reward: |X-Z| pips → R:R = Reward/Risk"
- If levels aren't perfectly clear, acknowledge uncertainty rather than guessing

**ANALYSIS STRUCTURE:**

1. **Setup Quality Grade** (A+ to F)
   - Overall rating with brief justification

2. **Visible Trade Parameters**
   - Entry price: [exact level if visible]
   - Stop Loss: [exact level if visible]  
   - Take Profit: [exact level if visible]
   - Direction: Long/Short

3. **Risk-Reward Analysis** 
   - Risk in pips: [calculate precisely]
   - Reward in pips: [calculate precisely]
   - R:R Ratio: [show calculation: Reward ÷ Risk = X:1]
   - VERIFY your math before stating R:R

4. **Key Strengths**
   - List 2-4 specific positives
   - Reference actual chart elements

5. **Critical Weaknesses**
   - List 2-4 specific concerns
   - Explain potential failure scenarios

6. **Market Structure & Context**
   - Current trend direction
   - Key support/resistance zones
   - Price action quality
   - Alignment with higher timeframe

7. **Entry & Exit Assessment**
   - Entry timing: premature/good/late?
   - Stop loss placement: tight/appropriate/wide?
   - Take profit: realistic/aggressive/conservative?

8. **Actionable Recommendations**
   - 3-5 specific improvements
   - Prioritize by importance
   - Include entry timing advice

**TONE:**
- Professional but direct
- Honest about flaws
- Specific, not generic
- Educational, not condescending
- If setup is poor, say so clearly
- If setup is excellent, explain exactly why

**ACCURACY REMINDERS:**
- Double-check all numerical calculations
- Verify price levels match chart markings
- Don't estimate - measure precisely
- Acknowledge if anything is unclear from the image`
            },
            {
              type: 'image_url',
              image_url: {
                url: image
              }
            }
          ]
        }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const result = await response.json();
    const analysis = result.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis returned from AI');
    }

    console.log('Analysis complete');

    // Deduct credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ ai_credits: profile.ai_credits - ANALYSIS_COST })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating credits:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        analysis,
        creditsUsed: ANALYSIS_COST,
        creditsRemaining: profile.ai_credits - ANALYSIS_COST
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Setup analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
