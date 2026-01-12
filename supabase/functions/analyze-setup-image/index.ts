import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANALYSIS_COST = 5;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_RETRIES = 3;
const CACHE_TTL_HOURS = 24;

// Helper to create a hash for caching
async function hashImage(imageData: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(imageData.substring(0, 1000)); // Use first 1000 chars for hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Check cache for existing analysis
async function checkCache(supabase: any, cacheKey: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('ai_response_cache')
      .select('response, expires_at')
      .eq('cache_key', cacheKey)
      .single();
    
    if (data && new Date(data.expires_at) > new Date()) {
      return data.response?.analysis || null;
    }
  } catch (e) {
    // Cache miss is fine
  }
  return null;
}

// Store analysis in cache
async function storeCache(supabase: any, cacheKey: string, analysis: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await supabase
      .from('ai_response_cache')
      .upsert({
        cache_key: cacheKey,
        response: { analysis },
        expires_at: expiresAt
      }, { onConflict: 'cache_key' });
  } catch (e) {
    console.error('Cache store error:', e);
  }
}

// Sleep helper for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Call Gemini with retries and exponential backoff
async function callGeminiWithRetry(
  apiKey: string,
  imageData: any,
  prompt: string
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Add jitter to avoid thundering herd
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`Retry attempt ${attempt + 1}, waiting ${delay}ms`);
        await sleep(delay);
      }

      const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              imageData
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      if (response.status === 429) {
        console.log('Rate limited, will retry...');
        lastError = new Error('Rate limited');
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        lastError = new Error(`Gemini API error: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const analysis = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!analysis) {
        lastError = new Error('No analysis in response');
        continue;
      }

      return analysis;
    } catch (e: any) {
      console.error('Gemini call error:', e);
      lastError = e;
    }
  }

  throw lastError || new Error('Failed after all retries');
}

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

    // Check cache first
    const imageHash = await hashImage(image);
    const cacheKey = `setup_analysis_${imageHash}`;
    
    const cachedAnalysis = await checkCache(supabase, cacheKey);
    if (cachedAnalysis) {
      console.log('Returning cached analysis');
      return new Response(
        JSON.stringify({ 
          analysis: cachedAnalysis,
          creditsUsed: 0,
          creditsRemaining: isPremium ? 'unlimited' : profile.ai_credits,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing setup image with Gemini...');

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
Calculate risk in pips, reward in pips, and the R:R ratio. Show your calculation work.

Key Strengths
List 2-4 specific positive aspects of this setup.

Critical Weaknesses
List 2-4 specific concerns.

Market Structure & Context
Current trend direction, key support/resistance zones, price action quality.

Entry & Exit Assessment
Entry timing, stop loss placement, take profit assessment.

Actionable Recommendations
Provide 3-5 specific improvements.

TONE: Professional but direct. Honest about flaws. Specific, not generic.

Remember: Write in natural, flowing sentences. No markdown, no asterisks.`;

    // Prepare image data
    let imageData: any;
    
    if (image.startsWith('data:')) {
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
      // For URL, fetch and convert to base64
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

    // Call Gemini with retry logic
    const analysis = await callGeminiWithRetry(GEMINI_API_KEY, imageData, analysisPrompt);

    console.log('Analysis complete');

    // Cache the result
    await storeCache(supabase, cacheKey, analysis);

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
    
    // Check if it's a rate limit error
    if (error.message?.includes('Rate limited') || error.message?.includes('429')) {
      return new Response(
        JSON.stringify({ 
          error: 'AI service is busy. Please try again in a moment.',
          retryAfter: 30
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
