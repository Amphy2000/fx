import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
  error?: {
    message: string;
    code: number;
  };
}

interface CacheEntry {
  response: any;
  expires_at: string;
}

// Rate limit tracking (in-memory for single function instance)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 12000; // 12 seconds between requests (5 RPM = 1 request per 12s)

// Create a hash for cache key
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Check cache for existing response
async function checkCache(
  supabase: any,
  cacheKey: string
): Promise<any | null> {
  try {
    const { data } = await supabase
      .from("ai_response_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (data && new Date(data.expires_at) > new Date()) {
      console.log("Cache hit for key:", cacheKey);
      return data.response;
    }
    return null;
  } catch {
    return null;
  }
}

// Store response in cache
async function storeCache(
  supabase: any,
  cacheKey: string,
  response: any,
  ttlMinutes: number = 60
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase
      .from("ai_response_cache")
      .upsert({
        cache_key: cacheKey,
        response,
        expires_at: expiresAt,
      }, { onConflict: "cache_key" });
    console.log("Cached response for key:", cacheKey);
  } catch (error) {
    console.error("Failed to cache response:", error);
  }
}

// Wait for rate limit
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Rate limit: waiting ${waitTime}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

// Call Gemini API with retry logic
async function callGeminiWithRetry(
  model: string,
  messages: { role: string; content: string }[],
  apiKey: string,
  maxRetries: number = 3
): Promise<string> {
  // Convert OpenAI-style messages to Gemini format
  const geminiContents: GeminiMessage[] = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  // Add system prompt as first user message if present
  const systemMessage = messages.find(m => m.role === "system");
  if (systemMessage) {
    geminiContents.unshift({
      role: "user",
      parts: [{ text: `System instructions: ${systemMessage.content}` }]
    });
    // Add a model acknowledgment
    geminiContents.splice(1, 0, {
      role: "model",
      parts: [{ text: "Understood. I will follow these instructions." }]
    });
  }

  const request: GeminiRequest = {
    contents: geminiContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.95,
      topK: 40,
    }
  };

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await waitForRateLimit();
      
      const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        }
      );

      if (response.status === 429) {
        // Rate limited - exponential backoff
        const waitTime = Math.pow(2, attempt) * 10000; // 10s, 20s, 40s
        console.log(`Rate limited (429). Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error (${response.status}):`, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No response content from Gemini");
      }

      return text;
    } catch (error) {
      lastError = error as Error;
      console.error(`Gemini attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 5000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error("All Gemini API attempts failed");
}

// Increment daily AI usage counter
async function incrementDailyUsage(
  supabase: any,
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    // Get current usage
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_ai_requests, last_ai_reset_date, subscription_tier")
      .eq("id", userId)
      .single();

    if (!profile) {
      return { allowed: false, remaining: 0 };
    }

    // Reset if new day
    const today = new Date().toISOString().split("T")[0];
    let currentRequests = profile.daily_ai_requests || 0;
    
    if (profile.last_ai_reset_date !== today) {
      currentRequests = 0;
    }

    // Check limits based on tier
    const limits: Record<string, number> = {
      free: 10,
      monthly: 100,
      lifetime: 500,
    };
    
    const limit = limits[profile.subscription_tier] || 10;
    
    if (currentRequests >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    await supabase
      .from("profiles")
      .update({
        daily_ai_requests: currentRequests + 1,
        last_ai_reset_date: today,
      })
      .eq("id", userId);

    return { allowed: true, remaining: limit - currentRequests - 1 };
  } catch (error) {
    console.error("Failed to check/increment daily usage:", error);
    return { allowed: true, remaining: -1 }; // Allow on error, don't block users
  }
}

// Main export: Call Gemini with caching and rate limiting
export async function callGemini(options: {
  supabaseUrl: string;
  supabaseKey: string;
  userId: string;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  cacheKey?: string;
  cacheTtlMinutes?: number;
  skipUsageCheck?: boolean;
}): Promise<{ text: string; cached: boolean; remainingRequests: number }> {
  const {
    supabaseUrl,
    supabaseKey,
    userId,
    prompt,
    systemPrompt,
    model = "gemini-2.0-flash-lite",
    cacheKey,
    cacheTtlMinutes = 60,
    skipUsageCheck = false,
  } = options;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Check cache first
  const effectiveCacheKey = cacheKey || hashString(prompt + (systemPrompt || ""));
  const cachedResponse = await checkCache(supabase, effectiveCacheKey);
  
  if (cachedResponse) {
    return { text: cachedResponse.text, cached: true, remainingRequests: -1 };
  }

  // Check daily usage limit
  if (!skipUsageCheck) {
    const usage = await incrementDailyUsage(supabase, userId);
    if (!usage.allowed) {
      throw new Error("Daily AI request limit reached. Try again tomorrow.");
    }
  }

  // Build messages
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  // Call Gemini
  const text = await callGeminiWithRetry(model, messages, apiKey);

  // Cache the response
  await storeCache(supabase, effectiveCacheKey, { text }, cacheTtlMinutes);

  const usage = skipUsageCheck ? { remaining: -1 } : await incrementDailyUsage(supabase, userId);
  
  return { text, cached: false, remainingRequests: usage.remaining ?? -1 };
}

// Fallback response generator for when API fails
export function generateFallbackResponse(context: string): string {
  const tips = [
    "Focus on your trading plan and stick to your predefined rules.",
    "Consider reviewing your recent trades to identify patterns.",
    "Remember: consistency is more important than occasional big wins.",
    "Take breaks when feeling overwhelmed - emotional control is key.",
    "Journal your thoughts before and after each trade.",
  ];
  
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  
  return `I'm currently unable to provide a detailed AI analysis (service temporarily unavailable). Here's a general tip: ${randomTip}\n\nContext: ${context}`;
}
