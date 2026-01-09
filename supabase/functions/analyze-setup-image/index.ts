import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANALYSIS_COST = 5;

// Gemini API for vision - direct call since gemini-client doesn't support images
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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
      .select('ai_credits, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to check credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isPremium = profile?.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(profile.subscription_tier);

    if (!isPremium && (!profile || profile.ai_credits < ANALYSIS_COST)) {
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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log('Analyzing setup image with Gemini Vision...');

    const analysisPrompt = `You are a professional trading analyst with 15+ years of experience. Analyze this trading chart with extreme precision.

CRITICAL INSTRUCTIONS:
- Study the chart carefully before responding
- Identify all visible price levels (entry, stop loss, take profit) with exact precision
- Calculate risk-reward ratios accurately by measuring actual pip distances
- Show your calculation work clearly
- If levels aren't perfectly clear, acknowledge uncertainty rather than guessing
- Write in natural, conversational language - NO asterisks, NO markdown formatting, NO special characters
- Use plain text only with clear paragraph breaks

ANALYSIS STRUCTURE:

Setup Quality Grade (A+ to F)
Give an overall rating with brief justification in plain language.

Visible Trade Parameters
Entry price, Stop Loss, Take Profit levels (exact values if visible), and Direction (Long/Short).

Risk-Reward Analysis
Calculate risk in pips, reward in pips, and the R:R ratio. Show your calculation work: "Entry: X, SL: Y, TP: Z → Risk: |X-Y| pips, Reward: |X-Z| pips → R:R = Reward/Risk". Verify your math before stating the ratio.

Key Strengths
List 2-4 specific positive aspects of this setup. Reference actual chart elements.

Critical Weaknesses
List 2-4 specific concerns. Explain potential failure scenarios.

Market Structure & Context
Current trend direction, key support/resistance zones, price action quality, and alignment with higher timeframe.

Entry & Exit Assessment
Entry timing (premature/good/late?), stop loss placement (tight/appropriate/wide?), take profit (realistic/aggressive/conservative?).

Actionable Recommendations
Provide 3-5 specific improvements, prioritized by importance, including entry timing advice.

TONE:
Professional but direct. Honest about flaws. Specific, not generic. Educational, not condescending. If the setup is poor, say so clearly. If it's excellent, explain exactly why.

ACCURACY REMINDERS:
Double-check all numerical calculations. Verify price levels match chart markings. Don't estimate - measure precisely. Acknowledge if anything is unclear from the image.

Remember: Write in natural, flowing sentences. No markdown, no asterisks, no special formatting. Just clear, honest analysis.`;

    // Determine if image is base64 or URL
    const isBase64 = image.startsWith('data:');
    let imageData: { inline_data?: { mime_type: string; data: string }; file_data?: { file_uri: string } };

    if (isBase64) {
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        imageData = {
          inline_data: {
            mime_type: matches[1],
            data: matches[2]
          }
        };
      } else {
        throw new Error('Invalid base64 image format');
      }
    } else {
      // For URL, we need to fetch and convert to base64
      const imageResponse = await fetch(image);
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      imageData = {
        inline_data: {
          mime_type: imageBlob.type || 'image/png',
          data: base64
        }
      };
    }

    const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: analysisPrompt },
            imageData
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini analysis failed: ${response.status}`);
    }

    const result = await response.json();
    const analysis = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysis) {
      throw new Error('No analysis returned from Gemini');
    }

    console.log('Analysis complete');

    // Deduct credits (only for free users)
    if (!isPremium) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ ai_credits: profile.ai_credits - ANALYSIS_COST })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating credits:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        analysis,
        creditsUsed: isPremium ? 0 : ANALYSIS_COST,
        creditsRemaining: isPremium ? 'unlimited' : (profile.ai_credits - ANALYSIS_COST)
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
