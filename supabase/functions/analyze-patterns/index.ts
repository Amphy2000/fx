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

async function callGemini(prompt: string, systemPrompt: string, apiKey: string, useTools = false): Promise<any> {
  const contents = [
    { role: "user", parts: [{ text: `Instructions: ${systemPrompt}` }] },
    { role: "model", parts: [{ text: "Understood." }] },
    { role: "user", parts: [{ text: prompt }] },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const body: any = { contents, generationConfig: { temperature: 0.5, maxOutputTokens: 2048 } };
      
      const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check daily limit
    const { data: profile } = await supabaseAdmin.from('profiles').select('subscription_tier, daily_ai_requests, last_ai_reset_date').eq('id', user.id).single();
    const today = new Date().toISOString().split('T')[0];
    let dailyRequests = profile?.daily_ai_requests || 0;
    if (profile?.last_ai_reset_date !== today) dailyRequests = 0;

    const isPremium = ['pro', 'lifetime', 'monthly'].includes(profile?.subscription_tier || 'free');
    const dailyLimit = isPremium ? 100 : 10;

    if (dailyRequests >= dailyLimit) {
      return new Response(JSON.stringify({ error: 'Daily AI limit reached' }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch trades (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: trades } = await supabaseAdmin.from('trades').select('*').eq('user_id', user.id).gte('created_at', ninetyDaysAgo.toISOString()).order('created_at', { ascending: true });

    if (!trades || trades.length < 5) {
      return new Response(JSON.stringify({ error: 'Need at least 5 trades', trades_count: trades?.length || 0 }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cache key based on user + trade count (cache for 24 hours)
    const cacheKey = `patterns_${user.id}_${trades.length}_${today}`;
    const cached = await checkCache(supabaseAdmin, cacheKey);
    if (cached?.patterns) {
      console.log("Returning cached patterns");
      return new Response(JSON.stringify({ patterns: cached.patterns, trades_analyzed: trades.length, cached: true, daily_requests_remaining: dailyLimit - dailyRequests }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    const pairPerformance = aggregateByPair(trades);
    const timePerformance = aggregateByTime(trades);
    const sessionPerformance = aggregateBySession(trades);

    const prompt = `Analyze ${trades.length} trades:
PAIRS: ${JSON.stringify(pairPerformance)}
TIME: ${JSON.stringify(timePerformance)}
SESSIONS: ${JSON.stringify(sessionPerformance)}

Return exactly 5 patterns as JSON array:
[{"pattern_type":"pair_based|time_based|session_based","description":"...","win_rate":number,"sample_size":number,"confidence_score":number,"recommendations":"..."}]`;

    let patterns = [];
    try {
      const result = await callGemini(prompt, "You are a forex pattern analyst. Return valid JSON array only.", geminiKey);
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      patterns = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (error) {
      console.error("Gemini failed:", error);
      // Generate basic patterns from data
      patterns = generateBasicPatterns(pairPerformance, timePerformance, sessionPerformance);
    }

    // Store patterns
    for (const pattern of patterns.slice(0, 5)) {
      await supabaseAdmin.from('trade_patterns').insert({
        user_id: user.id,
        pattern_type: pattern.pattern_type,
        pattern_description: pattern.description,
        win_rate: pattern.win_rate,
        sample_size: pattern.sample_size,
        confidence_score: pattern.confidence_score,
        recommendations: pattern.recommendations
      });
    }

    // Cache for 24 hours
    await storeCache(supabaseAdmin, cacheKey, { patterns }, 1440);

    // Update daily usage
    await supabaseAdmin.from('profiles').update({ daily_ai_requests: dailyRequests + 1, last_ai_reset_date: today }).eq('id', user.id);

    return new Response(JSON.stringify({ patterns, trades_analyzed: trades.length, daily_requests_remaining: dailyLimit - dailyRequests - 1 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in analyze-patterns:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function aggregateByPair(trades: any[]) {
  const pairStats: any = {};
  trades.forEach(trade => {
    if (!pairStats[trade.pair]) pairStats[trade.pair] = { total: 0, wins: 0, losses: 0, pnl: 0 };
    pairStats[trade.pair].total++;
    if (trade.result === 'win') pairStats[trade.pair].wins++;
    if (trade.result === 'loss') pairStats[trade.pair].losses++;
    pairStats[trade.pair].pnl += trade.profit_loss || 0;
  });
  return Object.entries(pairStats).map(([pair, stats]: [string, any]) => ({ pair, win_rate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0, total_trades: stats.total, total_pnl: stats.pnl.toFixed(2) }));
}

function aggregateByTime(trades: any[]) {
  const dayOfWeek: any = {};
  trades.forEach(trade => {
    const day = new Date(trade.created_at).toLocaleDateString('en-US', { weekday: 'long' });
    if (!dayOfWeek[day]) dayOfWeek[day] = { total: 0, wins: 0 };
    dayOfWeek[day].total++;
    if (trade.result === 'win') dayOfWeek[day].wins++;
  });
  return Object.entries(dayOfWeek).map(([day, stats]: [string, any]) => ({ day, win_rate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0, total_trades: stats.total }));
}

function aggregateBySession(trades: any[]) {
  const sessionStats: any = {};
  trades.forEach(trade => {
    const hour = new Date(trade.created_at).getUTCHours();
    let session = 'Asian';
    if (hour >= 7 && hour < 16) session = 'London';
    else if (hour >= 13 && hour < 22) session = 'New York';
    if (!sessionStats[session]) sessionStats[session] = { total: 0, wins: 0 };
    sessionStats[session].total++;
    if (trade.result === 'win') sessionStats[session].wins++;
  });
  return Object.entries(sessionStats).map(([session, stats]: [string, any]) => ({ session, win_rate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0, total_trades: stats.total }));
}

function generateBasicPatterns(pairs: any[], times: any[], sessions: any[]) {
  const patterns = [];
  const bestPair = pairs.sort((a, b) => parseFloat(b.win_rate) - parseFloat(a.win_rate))[0];
  if (bestPair) patterns.push({ pattern_type: 'pair_based', description: `Best performance on ${bestPair.pair}`, win_rate: parseFloat(bestPair.win_rate), sample_size: bestPair.total_trades, confidence_score: Math.min(bestPair.total_trades * 10, 80), recommendations: `Focus on ${bestPair.pair} setups` });
  const bestDay = times.sort((a, b) => parseFloat(b.win_rate) - parseFloat(a.win_rate))[0];
  if (bestDay) patterns.push({ pattern_type: 'time_based', description: `Best results on ${bestDay.day}`, win_rate: parseFloat(bestDay.win_rate), sample_size: bestDay.total_trades, confidence_score: Math.min(bestDay.total_trades * 10, 80), recommendations: `Consider trading more on ${bestDay.day}` });
  const bestSession = sessions.sort((a, b) => parseFloat(b.win_rate) - parseFloat(a.win_rate))[0];
  if (bestSession) patterns.push({ pattern_type: 'session_based', description: `Strongest in ${bestSession.session} session`, win_rate: parseFloat(bestSession.win_rate), sample_size: bestSession.total_trades, confidence_score: Math.min(bestSession.total_trades * 10, 80), recommendations: `Focus on ${bestSession.session} session` });
  return patterns;
}
