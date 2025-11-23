import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting weekly summary email job...");

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active users with emails who want to receive notifications
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, subscription_tier, email_notifications_enabled")
      .not("email", "is", null)
      .eq("subscription_status", "active")
      .eq("email_notifications_enabled", true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users to process`);

    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const profile of profiles || []) {
      try {
        console.log(`Processing user: ${profile.email}`);

        // Get last 7 days of trades
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: trades, error: tradesError } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", profile.id)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false });

        if (tradesError) {
          console.error(`Error fetching trades for ${profile.email}:`, tradesError);
          errorCount++;
          continue;
        }

        // Skip if no trades this week
        if (!trades || trades.length === 0) {
          console.log(`No trades for ${profile.email}, skipping`);
          continue;
        }

        // Calculate stats
        const totalTrades = trades.length;
        const wins = trades.filter(t => t.result === "win").length;
        const losses = trades.filter(t => t.result === "loss").length;
        const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
        const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
        
        // Find most traded pair
        const pairCounts = trades.reduce((acc: any, t) => {
          acc[t.pair] = (acc[t.pair] || 0) + 1;
          return acc;
        }, {});
        const mostTradedPair = Object.entries(pairCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "N/A";

        // Find best trade
        const bestTrade = trades.reduce((max, t) => 
          (t.profit_loss || 0) > (max.profit_loss || 0) ? t : max
        , trades[0]);

        // Get emotional overview
        const emotionCounts = trades.reduce((acc: any, t) => {
          if (t.emotion_before) {
            acc[t.emotion_before] = (acc[t.emotion_before] || 0) + 1;
          }
          return acc;
        }, {});
        const mostCommonEmotion = Object.entries(emotionCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "N/A";

        // Generate AI insight (if Pro/Lifetime)
        let aiInsight = "";
        if (profile.subscription_tier === "lifetime" || profile.subscription_tier === "monthly") {
          try {
            const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
            if (lovableApiKey) {
              const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${lovableApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "system",
                      content: "You are a professional trading coach. Provide brief, actionable weekly insights."
                    },
                    {
                      role: "user",
                      content: `Analyze this week's trading: ${totalTrades} trades, ${winRate}% win rate, $${totalPnL.toFixed(2)} P/L. Most traded: ${mostTradedPair}. Most common emotion: ${mostCommonEmotion}. Provide 2-3 key insights in 2-3 sentences.`
                    }
                  ],
                  max_tokens: 200
                })
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                aiInsight = aiData.choices?.[0]?.message?.content || "";
              }
            }
          } catch (aiError) {
            console.error("AI generation error:", aiError);
          }
        }

        // Generate email HTML
        const emailHtml = generateWeeklySummaryEmail({
          userName: profile.full_name || profile.email.split("@")[0],
          totalTrades,
          wins,
          losses,
          winRate,
          totalPnL,
          mostTradedPair,
          bestTradeProfit: bestTrade?.profit_loss || 0,
          mostCommonEmotion,
          aiInsight,
          subscriptionTier: profile.subscription_tier,
        });

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
          from: "Amphy AI <trading@amphyai.com>",
          to: [profile.email],
          subject: `📊 Your Weekly Trading Summary - ${winRate}% Win Rate`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          errorCount++;
        } else {
          console.log(`✓ Email sent to ${profile.email}`);
          successCount++;
        }

      } catch (userError) {
        console.error(`Error processing user ${profile.email}:`, userError);
        errorCount++;
      }

      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Job completed: ${successCount} emails sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: successCount,
        errors: errorCount,
        totalUsers: profiles?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Fatal error in weekly summary job:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateWeeklySummaryEmail(data: {
  userName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnL: number;
  mostTradedPair: string;
  bestTradeProfit: number;
  mostCommonEmotion: string;
  aiInsight?: string;
  subscriptionTier: string;
}): string {
  const isProfitable = data.totalPnL >= 0;
  const pnlColor = isProfitable ? "#10b981" : "#ef4444";
  const pnlEmoji = isProfitable ? "📈" : "📉";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Trading Summary</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                📊 Your Weekly Trading Summary
              </h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
                Hey ${data.userName}, here's how you performed this week
              </p>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 15px; background-color: #0f172a; border-radius: 12px;">
                    <div style="text-align: center;">
                      <p style="color: #94a3b8; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Total Trades</p>
                      <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 32px; font-weight: bold;">${data.totalTrades}</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 15px; background-color: #0f172a; border-radius: 12px;">
                    <div style="text-align: center;">
                      <p style="color: #94a3b8; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Win Rate</p>
                      <p style="color: #10b981; margin: 8px 0 0 0; font-size: 32px; font-weight: bold;">${data.winRate}%</p>
                    </div>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                <tr>
                  <td style="padding: 20px; background: linear-gradient(135deg, ${isProfitable ? '#065f46' : '#7f1d1d'} 0%, ${isProfitable ? '#047857' : '#991b1b'} 100%); border-radius: 12px; text-align: center;">
                    <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Profit/Loss</p>
                    <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 36px; font-weight: bold;">
                      ${pnlEmoji} $${isProfitable ? '+' : ''}${data.totalPnL.toFixed(2)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 15px; background-color: #0f172a; border-radius: 12px; margin-bottom: 15px;">
                    <table width="100%" cellpadding="5" cellspacing="0">
                      <tr>
                        <td style="color: #94a3b8; font-size: 14px;">Wins/Losses</td>
                        <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600;">${data.wins}W / ${data.losses}L</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8; font-size: 14px; padding-top: 10px;">Most Traded Pair</td>
                        <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600; padding-top: 10px;">${data.mostTradedPair}</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8; font-size: 14px; padding-top: 10px;">Best Trade</td>
                        <td align="right" style="color: #10b981; font-size: 14px; font-weight: 600; padding-top: 10px;">$${data.bestTradeProfit > 0 ? '+' : ''}${data.bestTradeProfit.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8; font-size: 14px; padding-top: 10px;">Dominant Emotion</td>
                        <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600; padding-top: 10px; text-transform: capitalize;">${data.mostCommonEmotion}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${data.aiInsight ? `
          <!-- AI Insights -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px solid #6366f1; border-radius: 12px; padding: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 24px; margin-right: 10px;">🤖</span>
                  <h3 style="color: #6366f1; margin: 0; font-size: 18px; font-weight: bold;">AI Coach Insights</h3>
                </div>
                <p style="color: #cbd5e1; margin: 0; font-size: 15px; line-height: 1.6;">
                  ${data.aiInsight}
                </p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="https://your-app-url.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                View Full Dashboard →
              </a>
            </td>
          </tr>

          ${data.subscriptionTier === 'free' ? `
          <!-- Upgrade CTA for Free Users -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                  ⚡ Unlock AI-Powered Insights
                </p>
                <p style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 14px;">
                  Get unlimited AI analysis, pattern recognition, and personalized coaching
                </p>
                <a href="https://your-app-url.com/pricing" style="display: inline-block; background-color: #ffffff; color: #d97706; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                  Upgrade Now
                </a>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">
                Keep trading smart and stay disciplined! 💪
              </p>
              <p style="color: #475569; margin: 0; font-size: 12px;">
                <a href="https://your-app-url.com/settings" style="color: #6366f1; text-decoration: none;">Notification Settings</a> • 
                <a href="https://your-app-url.com" style="color: #6366f1; text-decoration: none;">Amphy AI</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
