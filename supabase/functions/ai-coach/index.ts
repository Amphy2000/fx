import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Hash function for cache keys
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Check cache
async function checkCache(supabase: any, cacheKey: string): Promise<any | null> {
  try {
    const { data } = await supabase
      .from("ai_response_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .single();
    if (data && new Date(data.expires_at) > new Date()) {
      return data.response;
    }
    return null;
  } catch {
    return null;
  }
}

// Store in cache
async function storeCache(supabase: any, cacheKey: string, response: any, ttlMinutes: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase
      .from("ai_response_cache")
      .upsert({ cache_key: cacheKey, response, expires_at: expiresAt }, { onConflict: "cache_key" });
  } catch (error) {
    console.error("Cache store error:", error);
  }
}

// Call Gemini with retry
async function callGemini(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const contents = [
    { role: "user", parts: [{ text: `System: ${systemPrompt}` }] },
    { role: "model", parts: [{ text: "Understood." }] },
    { role: "user", parts: [{ text: prompt }] },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        }
      );

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 10000;
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Gemini error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
      console.error(`Gemini attempt ${attempt + 1} failed:`, error);
      if (attempt < 2) await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error("All Gemini attempts failed");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const serviceSupabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    // Get profile
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('ai_credits, subscription_tier, daily_ai_requests, last_ai_reset_date')
      .eq('id', user.id)
      .maybeSingle();

    const subscriptionTier = profileRow?.subscription_tier ?? 'free';
    const isPremium = ['pro', 'lifetime', 'monthly'].includes(subscriptionTier);

    // Check daily limit for free tier
    const today = new Date().toISOString().split('T')[0];
    let dailyRequests = profileRow?.daily_ai_requests || 0;
    if (profileRow?.last_ai_reset_date !== today) {
      dailyRequests = 0;
    }

    const dailyLimit = isPremium ? 100 : 10;
    if (dailyRequests >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: 'Daily AI limit reached', 
        message: 'Try again tomorrow or upgrade for more AI requests.' 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
    }

    // Last 7 days trades
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    const total = trades?.length ?? 0;
    const wins = (trades || []).filter(t => t.result === 'win').length;
    const losses = (trades || []).filter(t => t.result === 'loss').length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : null;

    // Emotion patterns
    const byEmotion: Record<string, { w: number; l: number; n: number }> = {};
    for (const t of (trades || [])) {
      const e = (t.emotion_before || 'unknown') as string;
      byEmotion[e] ||= { w: 0, l: 0, n: 0 };
      byEmotion[e].n++;
      if (t.result === 'win') byEmotion[e].w++; else if (t.result === 'loss') byEmotion[e].l++;
    }

    // Create cache key based on user + date (cache for 1 hour)
    const cacheKey = `coach_${user.id}_${today}_${hashString(JSON.stringify({ total, wins, losses }))}`;
    
    // Check cache first
    const cachedResponse = await checkCache(serviceSupabase, cacheKey);
    if (cachedResponse?.report) {
      console.log("Returning cached coach report");
      return new Response(JSON.stringify({ 
        report: cachedResponse.report, 
        cached: true,
        daily_requests_remaining: dailyLimit - dailyRequests 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      const fallbackReport = generateFallbackReport(total, wins, losses, winRate);
      return new Response(JSON.stringify({ report: fallbackReport, offline: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const statsSummary = `Weekly sample: ${total} trades, ${wins} wins, ${losses} losses${winRate !== null ? ` (win rate ${winRate}%)` : ''}.`;
    const emotionLines = Object.entries(byEmotion).map(([k, v]) => `- ${k}: ${v.w}/${v.n} wins`).join('\n');

    const system = "You are an elite trading mentor. Write concise, encouraging coaching with clear focus tasks.";
    const fewTrades = total < 10;

    const userPrompt = `${fewTrades ? `The user is new with fewer than 10 trades. Provide motivational, general coaching focusing on fundamentals and routines.` : `The user has historical data. Provide pattern-based coaching grounded in their data.`}

Recent 7d stats:
${statsSummary}
Emotional patterns:
${emotionLines || '- no emotion data this week'}

Format EXACTLY as:
📊 Weekly Summary: <short summary>
🧠 Key Pattern: <one-sentence pattern>
🎯 Focus Task: <one actionable task for next week>`;

    let report: string;
    try {
      report = await callGemini(userPrompt, system, geminiApiKey);
    } catch (error) {
      console.error("Gemini failed, using fallback:", error);
      report = generateFallbackReport(total, wins, losses, winRate);
    }

    // Cache the response for 60 minutes
    await storeCache(serviceSupabase, cacheKey, { report }, 60);

    // Update daily usage
    await serviceSupabase
      .from('profiles')
      .update({ 
        daily_ai_requests: dailyRequests + 1, 
        last_ai_reset_date: today 
      })
      .eq('id', user.id);

    return new Response(JSON.stringify({ 
      report, 
      daily_requests_remaining: dailyLimit - dailyRequests - 1 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('ai-coach error:', e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : 'Unknown error', 
      fallback: 'AI Coach temporarily unavailable.' 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});

function generateFallbackReport(total: number, wins: number, losses: number, winRate: number | null): string {
  const statsSummary = `${total} trades, ${wins} wins, ${losses} losses`;
  return `📊 Weekly Summary: ${statsSummary}
🧠 Key Pattern: ${winRate !== null ? (winRate >= 50 ? 'Strength in current approach; protect winners.' : 'Inconsistent outcomes; review entries.') : 'Building data; focus on consistency.'}
🎯 Focus Task: ${winRate !== null ? (winRate >= 50 ? 'Define 3 confluence rules before entry.' : 'Backtest 10 trades focusing on entry + SL.') : 'Log at least 5 trades this week with notes.'}`;
}
