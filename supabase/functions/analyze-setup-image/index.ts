import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANALYSIS_COST = 5;
const MAX_RETRIES = 3;
const CACHE_TTL_HOURS = 24;
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

// Helper to create a hash for caching
async function hashImage(imageData: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(imageData.substring(0, 1000)); // Use first 1000 chars for hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 32);
}

// Check cache for existing analysis
async function checkCache(supabase: any, cacheKey: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("ai_response_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (data && new Date(data.expires_at) > new Date()) {
      return data.response?.analysis || null;
    }
  } catch {
    // Cache miss is fine
  }
  return null;
}

// Store analysis in cache
async function storeCache(supabase: any, cacheKey: string, analysis: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await supabase
      .from("ai_response_cache")
      .upsert(
        {
          cache_key: cacheKey,
          response: { analysis },
          expires_at: expiresAt,
        },
        { onConflict: "cache_key" },
      );
  } catch (e) {
    console.error("Cache store error:", e);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRetryAfterSeconds(res: Response, fallbackSeconds: number): number {
  const retryAfterHeader = res.headers.get("retry-after");
  if (retryAfterHeader) {
    const asNumber = Number(retryAfterHeader);
    if (Number.isFinite(asNumber) && asNumber > 0) return Math.min(Math.ceil(asNumber), 600);

    const asDate = Date.parse(retryAfterHeader);
    if (!Number.isNaN(asDate)) {
      const seconds = Math.ceil((asDate - Date.now()) / 1000);
      if (seconds > 0) return Math.min(seconds, 600);
    }
  }

  return fallbackSeconds;
}

async function ensureDataUrl(image: string): Promise<string> {
  if (image.startsWith("data:")) return image;

  const imageResponse = await fetch(image);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image URL: ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type") ?? "image/png";
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return `data:${contentType};base64,${base64}`;
}

async function callLovableAIWithRetry({
  lovableApiKey,
  imageDataUrl,
  prompt,
}: {
  lovableApiKey: string;
  imageDataUrl: string;
  prompt: string;
}): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 500;
        console.log(`AI retry attempt ${attempt + 1}, waiting ${Math.round(delay)}ms`);
        await sleep(delay);
      }

      const resp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a professional trading analyst. Follow the user's requested structure exactly. Output plain text only.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (resp.status === 429) {
        const retryAfter = parseRetryAfterSeconds(resp, 60);
        throw new RateLimitError("AI rate limited.", retryAfter);
      }

      if (resp.status === 402) {
        const t = await resp.text();
        console.error("AI gateway 402:", t.slice(0, 500));
        throw new Error("AI usage limit reached. Please try again later.");
      }

      if (!resp.ok) {
        const t = await resp.text();
        console.error("AI gateway error:", resp.status, t.slice(0, 800));
        lastError = new Error(`AI gateway error: ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        lastError = new Error("No analysis in AI response");
        continue;
      }

      return content;
    } catch (e: any) {
      if (e?.name === "RateLimitError") throw e;
      console.error("AI call error:", e);
      lastError = e instanceof Error ? e : new Error("Unknown AI error");
    }
  }

  throw lastError || new Error("Failed after all retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ai_credits, subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(JSON.stringify({ error: "Failed to check credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPremium =
      profile?.subscription_tier && ["pro", "lifetime", "monthly"].includes(profile.subscription_tier);

    if (!isPremium && (!profile || profile.ai_credits < ANALYSIS_COST)) {
      return new Response(
        JSON.stringify({
          error: "Insufficient credits",
          required: ANALYSIS_COST,
          available: profile?.ai_credits || 0,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { image } = await req.json();
    if (!image) {
      throw new Error("No image provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const imageDataUrl = await ensureDataUrl(image);

    // Check cache first
    const imageHash = await hashImage(imageDataUrl);
    const cacheKey = `setup_analysis_${imageHash}`;

    const cachedAnalysis = await checkCache(supabase, cacheKey);
    if (cachedAnalysis) {
      console.log("Returning cached analysis");
      return new Response(
        JSON.stringify({
          analysis: cachedAnalysis,
          creditsUsed: 0,
          creditsRemaining: isPremium ? "unlimited" : profile.ai_credits,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Analyzing setup image with Lovable AI...");

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

    const analysis = await callLovableAIWithRetry({
      lovableApiKey: LOVABLE_API_KEY,
      imageDataUrl,
      prompt: analysisPrompt,
    });

    console.log("Analysis complete");

    // Cache the result
    await storeCache(supabase, cacheKey, analysis);

    // Deduct credits (only for free users)
    if (!isPremium) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ ai_credits: profile.ai_credits - ANALYSIS_COST })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating credits:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        analysis,
        creditsUsed: isPremium ? 0 : ANALYSIS_COST,
        creditsRemaining: isPremium ? "unlimited" : profile.ai_credits - ANALYSIS_COST,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Setup analysis error:", error);

    if (error?.name === "RateLimitError") {
      const retryAfter = Number((error as any).retryAfterSeconds ?? 60);
      return new Response(
        JSON.stringify({
          error: error.message || "AI rate limited.",
          retryAfter: Number.isFinite(retryAfter) ? retryAfter : 60,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

