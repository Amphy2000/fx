import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

export interface GeminiResponse {
  text: string;
}

export async function callGemini({
  supabaseUrl,
  supabaseKey,
  userId,
  prompt,
  imagePart,
  systemPrompt,
  cacheKey,
  cacheTtlMinutes = 60,
  skipUsageCheck = false,
  maxRetries = 3
}: {
  supabaseUrl: string;
  supabaseKey: string;
  userId: string;
  prompt: string;
  imagePart?: any;
  systemPrompt?: string;
  cacheKey?: string;
  cacheTtlMinutes?: number;
  skipUsageCheck?: boolean;
  maxRetries?: number;
}): Promise<GeminiResponse> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  // 1. Check Cache
  if (cacheKey && userId !== 'anonymous') {
    const { data: cached } = await supabaseAdmin
      .from('ai_request_logs')
      .select('response_text, created_at')
      .eq('request_hash', cacheKey)
      .eq('user_id', userId)
      .maybeSingle();

    if (cached) {
      const ageMinutes = (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60);
      if (ageMinutes < cacheTtlMinutes) {
        return { text: cached.response_text };
      }
    }
  }

  // 2. Prepare request parts
  const parts = [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }];
  if (imagePart) {
    parts.push(imagePart);
  }

  // 3. Call Gemini with Retries
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = errorBody?.error?.message || JSON.stringify(errorBody);
        console.error(`Gemini API Error: HTTP ${response.status}`, errorBody);
        
        if (!skipUsageCheck) {
          supabaseAdmin.from('ai_request_logs').insert({
            user_id: userId === 'anonymous' ? null : userId,
            request_type: imagePart ? 'vision_analysis' : 'text_analysis',
            request_hash: cacheKey,
            prompt_text: prompt.substring(0, 500),
            response_text: `Status: ${response.status} | Body: ${errorMessage}`,
            status: 'error'
          }).then(({ error }) => { if (error) console.error("Logging failed:", error); });
        }

        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 2000;
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Empty response from Gemini. This might be due to safety filters blocking the content.");
      }

      if (!skipUsageCheck) {
        supabaseAdmin.from('ai_request_logs').insert({
          user_id: userId === 'anonymous' ? null : userId,
          request_type: imagePart ? 'vision_analysis' : 'text_analysis',
          request_hash: cacheKey,
          prompt_text: prompt.substring(0, 500),
          response_text: text,
          status: 'success'
        }).then(({ error }) => { if (error) console.error("Logging failed:", error); });
      }

      return { text };

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;

      if (!skipUsageCheck) {
        supabaseAdmin.from('ai_request_logs').insert({
          user_id: userId === 'anonymous' ? null : userId,
          request_type: imagePart ? 'vision_analysis' : 'text_analysis',
          request_hash: cacheKey,
          prompt_text: prompt.substring(0, 500),
          response_text: error instanceof Error ? error.message : "Unknown error",
          status: 'error'
        }).then(({ error }) => { if (error) console.error("Logging failed:", error); });
      }

      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  throw lastError || new Error("AI is currently busy. Try again in 10 seconds.");
}

export function generateFallbackResponse(context: string): string {
  return `I'm temporarily experiencing high traffic. Based on a quick look at your ${context}, I recommend staying focused on your trading plan. Please try again in 30 seconds for a full analysis.`;
}
