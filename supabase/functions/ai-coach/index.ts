import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    // Credits check (shared with other AI tools) - ensure profile exists
    let profilePersisted = true;
    let profileCredits = 0;

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('ai_credits')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('ai-coach profile fetch error:', profileError);
    }

    if (!profileRow) {
      profilePersisted = false;
      profileCredits = 50; // default credits
      try {
        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .insert({ id: user.id, ai_credits: 50 })
          .select('ai_credits')
          .single();
        if (!createErr && created) {
          profilePersisted = true;
          profileCredits = created.ai_credits ?? 50;
        } else if (createErr) {
          console.error('ai-coach profile create error:', createErr);
        }
      } catch (e) {
        console.error('ai-coach profile create exception:', e);
      }
    } else {
      profileCredits = profileRow.ai_credits ?? 0;
    }

    const COACH_COST = 3;
    if (profileCredits < COACH_COST) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 });
    }

    // Last 7 days trades to ground coaching
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (tradesError) {
      console.error('ai-coach tradesError:', tradesError);
    }

    // Compute quick stats
    const total = trades?.length ?? 0;
    const wins = (trades || []).filter(t => t.result === 'win').length;
    const losses = (trades || []).filter(t => t.result === 'loss').length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : null;

    // Emotion win rates
    const byEmotion: Record<string, { w: number; l: number; n: number }> = {};
    for (const t of (trades || [])) {
      const e = (t.emotion_before || 'unknown') as string;
      byEmotion[e] ||= { w: 0, l: 0, n: 0 };
      byEmotion[e].n++;
      if (t.result === 'win') byEmotion[e].w++; else if (t.result === 'loss') byEmotion[e].l++;
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ ok: false, error: 'AI service temporarily unavailable', fallback: 'AI Trade Coach is temporarily unavailable. Please try again in a few minutes.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Build prompt per requested format
    const fewTrades = (await supabase.from('trades').select('id', { count: 'exact', head: true }).eq('user_id', user.id)).count ?? 0;

    const statsSummary = `Weekly sample: ${total} trades, ${wins} wins, ${losses} losses${winRate !== null ? ` (win rate ${winRate}%)` : ''}.`;
    const emotionLines = Object.entries(byEmotion).map(([k, v]) => `- ${k}: ${v.w}/${v.n} wins`).join('\n');

    const system = "You are an elite trading mentor. Write concise, encouraging coaching with clear focus tasks.";

    const userPrompt = `${fewTrades < 10 ? `The user is new with fewer than 10 trades lifetime. Provide motivational, general coaching focusing on fundamentals and routines.` : `The user has historical data. Provide pattern-based coaching grounded in their data.`}

Recent 7d stats:
${statsSummary}
Emotional patterns (based on emotion_before):
${emotionLines || '- no emotion data this week'}

Format the output EXACTLY as:
📊 Weekly Summary: <short summary>
🧠 Key Pattern: <one-sentence pattern>
🎯 Focus Task: <one actionable task for next week>
`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: 'Rate limited' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: 'Payment required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 });
      const t = await aiResp.text();
      console.error('ai-coach gateway error:', aiResp.status, t);
      // Provide an offline coaching report so the user isn't blocked
      const fallbackReport = `📊 Weekly Summary: ${statsSummary}\n🧠 Key Pattern: ${winRate !== null ? (winRate >= 50 ? 'Strength in current approach; protect winners and avoid overtrading.' : 'Inconsistent outcomes; review entries and risk placement.') : 'Insufficient data; focus on building consistent routines.'}\n🎯 Focus Task: ${winRate !== null ? (winRate >= 50 ? 'Define 3 confluence rules you MUST see before entry.' : 'Backtest 10 trades focusing on entry trigger + SL placement.') : 'Log at least 5 trades this week with reasons before/after.'}`;

      return new Response(
        JSON.stringify({ report: fallbackReport, offline: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const json = await aiResp.json();
    const report = json.choices?.[0]?.message?.content || '';

    if (!report) {
      return new Response(JSON.stringify({ ok: false, error: 'Empty report', fallback: 'AI Trade Coach is temporarily unavailable. Please try again later.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Deduct credits
    if (profilePersisted) {
      const { error: creditError } = await supabase.from('profiles').update({ ai_credits: profileCredits - COACH_COST }).eq('id', user.id);
      if (creditError) console.error('ai-coach credit deduction error:', creditError);
    }

    return new Response(JSON.stringify({ report, credits_remaining: profileCredits - COACH_COST }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('ai-coach error:', e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'Unknown error', fallback: 'AI Trade Coach is temporarily unavailable. Please try again in a few minutes.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});
