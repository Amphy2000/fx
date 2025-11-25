import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: TestEmailRequest = await req.json();
    
    console.log(`Sending test weekly summary to ${email}`);

    // Mock data for the weekly summary
    const mockData = {
      userName: "Demo User",
      totalTrades: 25,
      wins: 18,
      losses: 7,
      winRate: 72,
      totalPnL: 1250.50,
      mostTradedPair: "EUR/USD",
      bestTradeProfit: 350.00,
      mostCommonEmotion: "confident",
      aiInsight: "Great week! Your win rate of 72% shows strong discipline. Your most profitable trades came from EUR/USD. Consider maintaining your current risk management strategy while exploring similar setups on GBP/USD.",
      subscriptionTier: "monthly",
    };

    const emailHtml = generateWeeklySummaryEmail(mockData);

    const { error: emailError } = await resend.emails.send({
      from: "Amphy AI <amphyai@outlook.com>",
      to: [email],
      subject: `📊 Your Weekly Trading Summary - ${mockData.winRate}% Win Rate (TEST)`,
      html: emailHtml,
    });

    if (emailError) {
      console.error(`Error sending email to ${email}:`, emailError);
      throw emailError;
    }

    console.log(`✓ Test email sent to ${email}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Test weekly summary sent successfully"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error sending test weekly summary:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

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
              <a href="https://fx.lovable.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                View Full Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">
                Keep trading smart and stay disciplined! 💪
              </p>
              <p style="color: #475569; margin: 0; font-size: 12px;">
                <a href="https://fx.lovable.app/settings" style="color: #6366f1; text-decoration: none;">Notification Settings</a> • 
                <a href="https://fx.lovable.app" style="color: #6366f1; text-decoration: none;">Amphy AI</a>
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

serve(handler);
