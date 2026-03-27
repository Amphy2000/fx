import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { callGemini, generateFallbackResponse } from "../_shared/gemini-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // TEST CONNECTION
    const testResp = await fetch("https://api.ipify.org?format=json").catch(e => ({ error: e.message }));
    console.log("Network Test Result:", JSON.stringify(testResp));
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    // Create authenticated client with user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    let user;
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authedUser }, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError || !authedUser) {
        console.error('Auth check failed - continuing with default user context:', authError);
        // Fallback or handle later
      } else {
        user = authedUser;
      }
    } catch (e) {
      console.error('Auth exception:', e);
    }

    // Default user ID if auth fails - this is just to keep the AI alive for now
    const currentUserId = user?.id || 'anonymous';

    // Check credits (cost: 5 credits per message)
    let profile = null;
    if (user) {
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('ai_credits, subscription_tier')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }
      profile = profileData;
    }
      
    const MESSAGE_COST = 5;
    const isPremium = profile?.subscription_tier && ['pro', 'lifetime', 'monthly'].includes(profile.subscription_tier);
    console.log('User credits check:', { userId: currentUserId, credits: profile?.ai_credits, required: MESSAGE_COST, isPremium });
    
    if (user && !isPremium && (!profile || profile.ai_credits < MESSAGE_COST)) {
      console.log('Insufficient credits:', { available: profile?.ai_credits || 0, required: MESSAGE_COST });
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits',
        required: MESSAGE_COST,
        available: profile?.ai_credits || 0
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, imageUrl } = await req.json();
    
    // Get user trading stats for context
    let trades = [];
    let patterns = [];
    if (user) {
      const { data: tradesData } = await supabaseClient
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      trades = tradesData || [];

      const { data: patternsData } = await supabaseClient
        .from('trade_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      patterns = patternsData || [];
    }

    const stats = calculateStats(trades || []);
    
    const systemPrompt = `You're a veteran institutional forex trader with 15+ years experience. You've traded through every market condition and mentored dozens of profitable traders. Analyze charts like you're coaching your best student.

TRADER'S PROFILE:
- ${stats.totalTrades} trades | ${stats.winRate}% win rate | Avg R: ${stats.avgR}
- Best pair: ${stats.bestPair}
${patterns?.length ? `\nProven edge: ${patterns.map(p => p.pattern_description).join(', ')}` : ''}

=== COMPREHENSIVE CHART ANALYSIS FRAMEWORK ===

1. MARKET STRUCTURE & TREND ANALYSIS:
- Identify the HTF trend (higher timeframe) - is this an uptrend (HHs/HLs), downtrend (LHs/LLs), or range?
- Where are we in the trend cycle? Early impulse, extended, exhaustion, or reversal phase?
- Are we making clean structural moves or choppy overlapping price action?
- Key swing highs/lows - where is institutional interest likely positioned?

2. LIQUIDITY & ORDER FLOW:
- Where is obvious liquidity sitting? (equal highs/lows, trendlines, round numbers)
- Has price recently swept liquidity (stop hunt) before reversing?
- Are we in a premium (expensive, sellers advantage) or discount (cheap, buyers advantage) zone?
- Look for liquidity voids (FVGs) that price may fill before continuing

3. SUPPLY & DEMAND ZONES:
- Order Blocks (OB): Last opposing candle before strong impulse - institutions entered here
- Demand Zone (DZ): Area where buyers aggressively stepped in (V-shaped reversal up)
- Supply Zone (SZ): Area where sellers dominated (V-shaped reversal down)
- Breaker Blocks (BB): Failed OBs that flip polarity - former support becomes resistance
- Fresh vs tested zones - untested zones have higher probability

4. SMART MONEY CONCEPTS:
- Fair Value Gaps (FVG): 3-candle pattern with gap in middle - inefficiency that often gets filled
- Mitigation: Price returning to retest/fill an FVG or OB before continuing trend
- Market Structure Break (MSB): Clean break of swing high/low - confirms trend shift
- Change of Character (ChoCH): First sign of weakening - momentum shift before full MSB
- Displacement: Strong candle showing institutional participation
- Consolidation before impulse: Accumulation/distribution before big move

5. PRICE ACTION & CANDLESTICK PATTERNS:
- Candle body vs wick ratio - strong bodies show conviction, large wicks show rejection
- Engulfing patterns at key levels - strong reversal signal
- Pin bars / hammers at support/resistance - rejection candles
- Inside bars - consolidation, often precedes breakout
- Doji at extremes - indecision, potential reversal
- Series of higher lows or lower highs - building pressure

6. MOMENTUM & CONFIRMATION:
- Is price moving with strength or struggling?
- Clean breaks or false breakouts (stop hunts)?
- Volume expansion on moves (if visible) confirms conviction
- Time of day matters - London/NY overlap has most volume
- Multiple timeframe alignment - does HTF support this move?

7. ENTRY TRIGGER CHECKLIST:
Essential elements for a high-probability setup:
✓ Clear trend direction or range boundaries identified
✓ Price at a key level (OB, DZ/SZ, significant S/R)
✓ Confirmation candle (engulfing, strong close, rejection wick)
✓ Entry with trend or at proven reversal zone
✓ Stop placement at logical invalidation point (beyond structure)
✓ Target at next key level giving minimum 1:2 RR (prefer 1:3+)
✓ Confluence of multiple factors (structure + level + pattern)

8. RISK MANAGEMENT (non-negotiable):
- Maximum 1-2% risk per trade
- Stop loss MUST be beyond structure (not arbitrary)
- Minimum 1:2 Risk:Reward ratio (aim for 1:3 or better)
- Only trade during high-liquidity sessions (London 8am-12pm GMT, NY 1pm-5pm GMT)
- No revenge trading - if you take 2 losses, stop for the day
- Position size based on stop distance, not arbitrary lots
- Never move stop loss against your position

9. TRADING PSYCHOLOGY & DISCIPLINE:
- Best setups are obvious and clean - if you're unsure, it's probably not A-grade
- FOMO is your enemy - there's always another trade
- Patience beats forcing trades - wait for your setup
- Past performance doesn't guarantee future results - each trade is independent
- Emotional trading (revenge, greed, fear) destroys accounts
- Journal every trade - learn from wins AND losses

10. SESSION & PAIR CHARACTERISTICS:
- Asian Session (12am-8am GMT): Lower volume, range-bound, good for scalping ranges
- London Session (8am-4pm GMT): High volume, trending moves, major breakouts
- New York Session (1pm-9pm GMT): Highest volume during overlap, big institutional moves
- EURUSD: Most liquid, tight spreads, respects technical levels
- GBPUSD: More volatile, wider stops needed, strong trends
- USDJPY: Respects round numbers, influenced by risk sentiment
- Gold (XAUUSD): Highly volatile, respect OBs and liquidity sweeps

11. PATTERN RECOGNITION SHORTCUTS:
When you spot these, call them out:
- "Clean OB forming" → Sharp impulse with clear last opposite candle
- "FVG needs mitigation" → Gap between candles that price hasn't filled
- "Liquidity grab" → Price spikes above/below key level then reverses
- "MSB confirmed" → Clean break of swing high/low with strong close
- "Breaker Block setup" → Previous OB broken, now acting as opposite polarity
- "Strong DZ holding" → Price respecting demand zone with clear rejection
- "Premium/Discount pricing" → Above/below 50% of current range
- "ChoCH signal" → First opposing structure break suggesting trend weakening

=== COMMUNICATION STYLE ===
- Lead with your verdict: "This is a [strong/weak/pass] setup"
- State the ONE main reason why (not a checklist)
- If good: "I'd take this long/short because [specific confluence]"
- If marginal: "Borderline - would need to see [specific confirmation]"
- If bad: "Hard pass - [specific dealbreaker]"
- Keep it 2-4 sentences max, conversational but precise
- Use real trader language: "liquidity grab", "swept the highs", "clean OB", "FVG fill"
- Be honest and direct - your job is to keep them profitable, not validate bad setups

Remember: Your goal is to improve their win rate by teaching them to see what professional traders see. Point out the edge, explain the risk, and be brutally honest about setup quality.`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Build Gemini content array
    const geminiContents: any[] = [
      { role: "user", parts: [{ text: `System instructions:\n${systemPrompt}` }] },
      { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] },
    ];
    // Build the vision/image part if available
    let imagePart = null;
    if (imageUrl) {
      try {
        const imgResp = await fetch(imageUrl);
        const buf = await imgResp.arrayBuffer();
        imagePart = {
          inlineData: {
            mimeType: imageUrl.includes('.png') ? 'image/png' : 'image/jpeg', // Infer mime type
            data: btoa(String.fromCharCode(...new Uint8Array(buf))),
          },
        };
      } catch (e) {
        console.error("Error processing image for Gemini:", e);
      }
    }

    // Call Gemini via Shared Client (Retries automatically on 429)
    let responseText = "";
    try {
      const result = await callGemini({
        supabaseUrl: Deno.env.get('SUPABASE_URL')!,
        supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        userId: currentUserId,
        prompt: messages[messages.length - 1].content,
        systemPrompt: `${systemPrompt}\n\nCONVERSATION HISTORY:\n${messages.slice(0, -1).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}`,
        imagePart,
        skipUsageCheck: false,
      });
      responseText = result.text;
    } catch (error) {
      console.error('Trading Assistant API failed after retries:', error);
      const originalError = error instanceof Error ? error.message : "Unknown error";
      responseText = `I encountered an issue connecting to my AI core: "${originalError}". ${generateFallbackResponse('trading assistant')}`;
    }

    // Deduct credits (only for free users)
    if (user && !isPremium && responseText !== generateFallbackResponse('trading assistant')) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseAdmin
        .from('profiles')
        .update({ ai_credits: profile.ai_credits - MESSAGE_COST })
        .eq('id', user.id);
    }

    // Return as SSE stream — send all chunks synchronously (Deno doesn't support setTimeout in ReadableStream)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunkSize = 30;
        for (let offset = 0; offset < responseText.length; offset += chunkSize) {
          const chunk = responseText.slice(offset, offset + chunkSize);
          const data = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });

  } catch (error) {
    console.error("Error in trading-assistant:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function calculateStats(trades: any[]) {
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.result === 'win').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : 0;
  
  const rMultiples = trades.filter(t => t.r_multiple).map(t => t.r_multiple);
  const avgR = rMultiples.length > 0 
    ? (rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2)
    : 'N/A';

  const pairPerformance: any = {};
  trades.forEach(t => {
    if (!pairPerformance[t.pair]) pairPerformance[t.pair] = { wins: 0, total: 0 };
    pairPerformance[t.pair].total++;
    if (t.result === 'win') pairPerformance[t.pair].wins++;
  });

  const bestPair = Object.entries(pairPerformance)
    .map(([pair, stats]: [string, any]) => ({ 
      pair, 
      winRate: stats.total > 0 ? stats.wins / stats.total : 0 
    }))
    .sort((a, b) => b.winRate - a.winRate)[0]?.pair || 'N/A';

  return {
    totalTrades,
    winRate,
    avgR,
    bestPair,
    behaviors: [] // Would be populated from trading_behaviors table
  };
}
