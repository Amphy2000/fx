import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function checkCache(supabase: any, cacheKey: string): Promise<any | null> {
  try {
    const { data } = await supabase.from("ai_response_cache").select("response, expires_at").eq("cache_key", cacheKey).single();
    if (data && new Date(data.expires_at) > new Date()) return data.response;
    return null;
  } catch { return null; }
}

async function storeCache(supabase: any, cacheKey: string, response: any, ttlMinutes: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from("ai_response_cache").upsert({ cache_key: cacheKey, response, expires_at: expiresAt }, { onConflict: "cache_key" });
  } catch (e) { console.error("Cache error:", e); }
}

async function callGemini(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const contents = [
    { role: "user", parts: [{ text: `Instructions: ${systemPrompt}` }] },
    { role: "model", parts: [{ text: "Understood." }] },
    { role: "user", parts: [{ text: prompt }] },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 512 } }),
      });

      if (response.status === 429) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 10000));
        continue;
      }
      if (!response.ok) throw new Error(`Gemini: ${response.status}`);

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt < 2) await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error("Gemini unavailable");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Please log in" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Please log in" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check daily limit
    const { data: profile } = await supabaseClient.from('profiles').select('subscription_tier, daily_ai_requests, last_ai_reset_date').eq('id', user.id).single();
    const today = new Date().toISOString().split('T')[0];
    let dailyRequests = profile?.daily_ai_requests || 0;
    if (profile?.last_ai_reset_date !== today) dailyRequests = 0;

    const isPremium = ['pro', 'lifetime', 'monthly'].includes(profile?.subscription_tier || 'free');
    const dailyLimit = isPremium ? 100 : 10;

    if (dailyRequests >= dailyLimit) {
      return new Response(JSON.stringify({ error: 'Daily AI limit reached' }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get trades from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: trades } = await supabaseClient.from('trades').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false });

    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ summary: "No trades this week. Log some trades to get AI insights!", stats: { totalTrades: 0, winRate: 0, wins: 0, losses: 0, mostTradedPair: "N/A" } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cache key for weekly summary
    const cacheKey = `weekly_${user.id}_${today}_${trades.length}`;
    const cached = await checkCache(serviceClient, cacheKey);
    if (cached?.summary) {
      console.log("Returning cached weekly summary");
      return new Response(JSON.stringify({ ...cached, cached: true, daily_requests_remaining: dailyLimit - dailyRequests }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calculate statistics
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;

    const pairCounts: Record<string, number> = {};
    trades.forEach(t => { pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1; });
    const mostTradedPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const totalPL = trades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0), 0);

    const emotionCounts: Record<string, number> = {};
    trades.forEach(t => { if (t.emotion_before) emotionCounts[t.emotion_before] = (emotionCounts[t.emotion_before] || 0) + 1; });

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    
    let summary: string;
    if (!geminiKey) {
      summary = generateFallbackSummary(trades.length, wins, losses, winRate, totalPL, mostTradedPair);
    } else {
      const prompt = `Trader's week: ${trades.length} trades, ${wins} wins, ${losses} losses, ${winRate}% win rate, P/L: ${totalPL > 0 ? '+' : ''}${totalPL.toFixed(2)}, favorite pair: ${mostTradedPair}. Emotions: ${Object.keys(emotionCounts).join(', ') || 'not tracked'}. 

Write a brief, personal weekly recap (under 100 words). Be conversational, specific, and give one actionable tip.`;

      try {
        summary = await callGemini(prompt, "You're a friendly trading mentor giving weekly feedback. Be genuine and specific.", geminiKey);
      } catch (error) {
        console.error("Gemini failed:", error);
        summary = generateFallbackSummary(trades.length, wins, losses, winRate, totalPL, mostTradedPair);
      }
    }

    const stats = { totalTrades: trades.length, winRate, wins, losses, mostTradedPair, totalPL };

    // Cache for 6 hours
    await storeCache(serviceClient, cacheKey, { summary, stats }, 360);

    // Update daily usage
    await serviceClient.from('profiles').update({ daily_ai_requests: dailyRequests + 1, last_ai_reset_date: today }).eq('id', user.id);

    return new Response(JSON.stringify({ summary, stats, daily_requests_remaining: dailyLimit - dailyRequests - 1 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in weekly-summary:", error);
    return new Response(JSON.stringify({ error: "Something went wrong. Try again?" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function generateFallbackSummary(total: number, wins: number, losses: number, winRate: number, totalPL: number, pair: string): string {
  if (winRate >= 60) return `Great week! ${wins} wins from ${total} trades (${winRate}% win rate). Your ${pair} setups are working. Keep this momentum but don't overtrade.`;
  if (winRate >= 40) return `Solid effort with ${total} trades this week. ${winRate}% win rate shows room to grow. Focus on your entry timing and stick to your best setups.`;
  return `Tough week with ${losses} losses. Take a step back, review what went wrong, and come back stronger. Every trader has these weeks.`;
}
