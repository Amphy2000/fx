import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.3, maxOutputTokens: 1024 } }),
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check daily limit
    const { data: profile } = await supabase.from('profiles').select('subscription_tier, daily_ai_requests, last_ai_reset_date').eq('id', user.id).single();
    const today = new Date().toISOString().split('T')[0];
    let dailyRequests = profile?.daily_ai_requests || 0;
    if (profile?.last_ai_reset_date !== today) dailyRequests = 0;

    const isPremium = ['pro', 'lifetime', 'monthly'].includes(profile?.subscription_tier || 'free');
    const dailyLimit = isPremium ? 100 : 10;

    if (dailyRequests >= dailyLimit) {
      return new Response(JSON.stringify({ error: 'Daily AI limit reached' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { periodDays = 30 } = await req.json();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Cache key
    const cacheKey = `journal_${user.id}_${periodDays}_${today}`;
    const cached = await checkCache(supabaseAdmin, cacheKey);
    if (cached?.insights) {
      console.log("Returning cached journal insights");
      return new Response(JSON.stringify({ insights: cached.insights, cached: true, daily_requests_remaining: dailyLimit - dailyRequests }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch data
    const { data: journalEntries } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).gte('entry_date', startDate.toISOString().split('T')[0]).lte('entry_date', endDate.toISOString().split('T')[0]);
    const { data: checkIns } = await supabase.from('daily_checkins').select('*').eq('user_id', user.id).gte('check_in_date', startDate.toISOString().split('T')[0]).lte('check_in_date', endDate.toISOString().split('T')[0]);
    const { data: trades } = await supabase.from('trades').select('*').eq('user_id', user.id).gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());

    if (!trades || trades.length < 5) {
      return new Response(JSON.stringify({ error: 'Not enough data', message: 'Need at least 5 trades.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    const dataSummary = {
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.result === 'win').length,
      losingTrades: trades.filter(t => t.result === 'loss').length,
      journalCount: journalEntries?.length || 0,
      checkInCount: checkIns?.length || 0,
      emotionalTrades: trades.filter(t => t.emotion_before).map(t => ({ emotion: t.emotion_before, result: t.result }))
    };

    const prompt = `Analyze trader data (${periodDays} days): ${JSON.stringify(dataSummary)}

Return JSON:
{"emotionalPatterns":{"positiveStates":[],"negativeStates":[],"neutral":[]},"performanceCorrelation":{"bestMoods":[],"worstMoods":[],"optimalConditions":[]},"keyInsights":["..."],"recommendations":["..."],"confidenceScore":number}`;

    let analysis;
    try {
      const result = await callGemini(prompt, "You are a trading psychologist. Return valid JSON only.", geminiKey);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : generateFallbackAnalysis(dataSummary);
    } catch (e) {
      console.error("Gemini failed:", e);
      analysis = generateFallbackAnalysis(dataSummary);
    }

    // Store insights
    await supabase.from('journal_insights').insert({
      user_id: user.id,
      analysis_period_start: startDate.toISOString().split('T')[0],
      analysis_period_end: endDate.toISOString().split('T')[0],
      emotional_patterns: analysis.emotionalPatterns,
      performance_correlation: analysis.performanceCorrelation,
      key_insights: analysis.keyInsights,
      recommendations: analysis.recommendations,
      confidence_score: analysis.confidenceScore
    });

    // Cache for 24 hours
    await storeCache(supabaseAdmin, cacheKey, { insights: analysis }, 1440);

    // Update daily usage
    await supabaseAdmin.from('profiles').update({ daily_ai_requests: dailyRequests + 1, last_ai_reset_date: today }).eq('id', user.id);

    return new Response(JSON.stringify({ insights: analysis, daily_requests_remaining: dailyLimit - dailyRequests - 1 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Journal insights error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function generateFallbackAnalysis(data: any) {
  const winRate = data.totalTrades > 0 ? (data.winningTrades / data.totalTrades) * 100 : 0;
  return {
    emotionalPatterns: { positiveStates: ["calm", "confident"], negativeStates: ["anxious", "impatient"], neutral: ["neutral"] },
    performanceCorrelation: { bestMoods: ["calm"], worstMoods: ["anxious"], optimalConditions: ["well-rested", "prepared"] },
    keyInsights: [winRate >= 50 ? "Your win rate shows solid execution" : "Focus on improving entry timing", "Emotional awareness is key to consistency"],
    recommendations: ["Continue tracking emotions before trades", "Review losing trades for patterns"],
    confidenceScore: Math.min(data.totalTrades * 5, 70)
  };
}
