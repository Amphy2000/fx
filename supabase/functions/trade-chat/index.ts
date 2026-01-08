import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Simple hash for cache
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Check cache
async function checkCache(supabase: any, cacheKey: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("ai_response_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .single();
    if (data && new Date(data.expires_at) > new Date()) {
      return data.response?.reply;
    }
    return null;
  } catch {
    return null;
  }
}

// Store cache
async function storeCache(supabase: any, cacheKey: string, reply: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min cache
    await supabase
      .from("ai_response_cache")
      .upsert({ cache_key: cacheKey, response: { reply }, expires_at: expiresAt }, { onConflict: "cache_key" });
  } catch (error) {
    console.error("Cache error:", error);
  }
}

// Call Gemini
async function callGemini(messages: any[], apiKey: string): Promise<string> {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  // Add system as first user message
  const systemMsg = messages.find(m => m.role === 'system');
  if (systemMsg) {
    contents.unshift(
      { role: 'user', parts: [{ text: `Instructions: ${systemMsg.content}` }] },
      { role: 'model', parts: [{ text: 'Understood, I will follow these instructions.' }] }
    );
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
          }),
        }
      );

      if (response.status === 429) {
        const wait = Math.pow(2, attempt) * 10000;
        console.log(`Rate limited, waiting ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!response.ok) throw new Error(`Gemini: ${response.status}`);

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble thinking right now. Try again?";
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt < 2) await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error("Gemini unavailable");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, messages: history } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Please log in to chat." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Please log in again." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check daily limit
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_tier, daily_ai_requests, last_ai_reset_date')
      .eq('id', user.id)
      .single();

    const today = new Date().toISOString().split('T')[0];
    let dailyRequests = profile?.daily_ai_requests || 0;
    if (profile?.last_ai_reset_date !== today) dailyRequests = 0;

    const isPremium = ['pro', 'lifetime', 'monthly'].includes(profile?.subscription_tier || 'free');
    const dailyLimit = isPremium ? 100 : 10;

    if (dailyRequests >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: 'Daily limit reached. Try again tomorrow!',
        daily_requests_remaining: 0
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent trades for context
    const { data: trades } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const wins = trades?.filter(t => t.result === 'win').length || 0;
    const losses = trades?.filter(t => t.result === 'loss').length || 0;
    const totalTrades = trades?.length || 0;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ 
        reply: "I'm taking a quick break. Try again in a moment!",
        daily_requests_remaining: dailyLimit - dailyRequests
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context
    const insightContext = `Context (use to inform, don't quote unless asked): ${totalTrades} trades, ${winRate}% win rate, ${wins}W/${losses}L.`;

    const historyNormalized = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
          .slice(-6) // Last 6 messages only to save tokens
          .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 500) }))
      : [];

    // Check cache for similar recent messages
    const cacheKey = `chat_${user.id}_${hashString(message || '')}`;
    const cachedReply = await checkCache(serviceClient, cacheKey);
    if (cachedReply) {
      console.log("Returning cached chat reply");
      return new Response(JSON.stringify({ 
        reply: cachedReply,
        cached: true,
        daily_requests_remaining: dailyLimit - dailyRequests
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatMessages = [
      { role: "system", content: `You're a friendly trading buddy. Be natural and conversational. ${insightContext}` },
      ...historyNormalized,
    ];

    if (message?.trim()) {
      chatMessages.push({ role: "user", content: message });
    }

    let reply: string;
    try {
      reply = await callGemini(chatMessages, geminiKey);
    } catch (error) {
      console.error("Gemini failed:", error);
      reply = "I'm having a quick coffee break ☕. Try again in a moment!";
    }

    // Cache the response
    await storeCache(serviceClient, cacheKey, reply);

    // Update daily usage
    await serviceClient
      .from('profiles')
      .update({ daily_ai_requests: dailyRequests + 1, last_ai_reset_date: today })
      .eq('id', user.id);

    return new Response(JSON.stringify({ 
      reply,
      daily_requests_remaining: dailyLimit - dailyRequests - 1
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in trade-chat:", error);
    return new Response(JSON.stringify({ 
      reply: "Oops! Something went wrong. Try again?"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
