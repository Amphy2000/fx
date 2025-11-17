import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null);

    if (profilesError) throw profilesError;

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const profile of profiles || []) {
      try {
        // Check if user has MT5 accounts
        const { data: mt5Accounts } = await supabaseClient
          .from('mt5_accounts')
          .select('id, account_name, broker_name')
          .eq('user_id', profile.id)
          .eq('is_active', true);

        const { data: trades, error: tradesError } = await supabaseClient
          .from('trades')
          .select('*')
          .eq('user_id', profile.id)
          .gte('created_at', today)
          .order('created_at', { ascending: false });

        if (tradesError) throw tradesError;

        if (!trades || trades.length === 0) {
          console.log(`No trades today for ${profile.email}, skipping`);
          continue;
        }

        const wins = trades.filter(t => t.result === 'win').length;
        const winRate = (wins / trades.length * 100).toFixed(1);
        const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
        const avgR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length;
        
        const hasMT5 = mt5Accounts && mt5Accounts.length > 0;
        const emotionTracked = trades.filter(t => t.emotion_before || t.emotion_after).length;

        const aiPrompt = `Analyze today's trading performance:

${hasMT5 ? `MT5 Integration: Trades auto-synced from ${mt5Accounts.map(a => a.broker_name).join(', ')}` : 'Manual Trade Journal'}
Trades: ${trades.length}
Win Rate: ${winRate}%
P/L: $${totalPnL.toFixed(2)}
Avg R: ${avgR.toFixed(2)}
Emotions Tracked: ${emotionTracked}/${trades.length} trades

Trades:
${trades.map(t => `${t.pair} ${t.direction}: $${t.profit_loss?.toFixed(2)} ${t.emotion_before ? `(${t.emotion_before})` : ''}`).join('\n')}

Provide:
1. Quick performance summary
2. Top 2 things done well
3. Top 2 areas to improve tomorrow
4. One specific action for tomorrow
${hasMT5 && emotionTracked < trades.length / 2 ? '\n5. Remind to track emotions for better insights' : ''}

Be brief and actionable.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a concise trading coach providing daily feedback.' },
              { role: 'user', content: aiPrompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error('AI error:', aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const aiSummary = aiData.choices[0].message.content;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">📊 Your Daily Trading Summary</h1>
            <p>Hi ${profile.full_name || 'Trader'}!</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">Today's Results</h2>
              <table style="width: 100%;">
                <tr><td><strong>Trades:</strong></td><td style="text-align: right;">${trades.length}</td></tr>
                <tr><td><strong>Win Rate:</strong></td><td style="text-align: right; color: ${parseFloat(winRate) >= 50 ? '#10b981' : '#ef4444'};">${winRate}%</td></tr>
                <tr><td><strong>P/L:</strong></td><td style="text-align: right; color: ${totalPnL >= 0 ? '#10b981' : '#ef4444'};">$${totalPnL.toFixed(2)}</td></tr>
                <tr><td><strong>Avg R:</strong></td><td style="text-align: right;">${avgR.toFixed(2)}R</td></tr>
              </table>
            </div>

            <div style="background: #fff; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
              <h2 style="color: #333; margin-top: 0;">🤖 Coach Feedback</h2>
              <div style="white-space: pre-wrap; line-height: 1.6;">${aiSummary}</div>
            </div>

            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
              <p style="color: #999; font-size: 12px;">AmphyFX Trading Analytics</p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: 'AmphyFX <onboarding@resend.dev>',
          to: [profile.email],
          subject: `📊 Daily Summary - ${trades.length} Trades, $${totalPnL.toFixed(2)}`,
          html: emailHtml,
        });

        results.push({ email: profile.email, status: 'sent' });

      } catch (userError) {
        console.error(`Error for ${profile.email}:`, userError);
        results.push({ email: profile.email, status: 'error' });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
