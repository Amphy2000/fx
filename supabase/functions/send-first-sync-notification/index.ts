import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  email: string;
  name: string;
  accountNumber: string;
  brokerName: string;
  tradesCount: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, accountNumber, brokerName, tradesCount }: NotificationRequest = await req.json();

    console.log(`Sending first sync notification to ${email} for account ${accountNumber}`);

    const emailResponse = await resend.emails.send({
      from: "TradeJournal <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 MT5 Account Successfully Connected!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-icon { font-size: 48px; margin-bottom: 10px; }
              .account-details { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1 style="margin: 0; font-size: 28px;">MT5 Connection Successful!</h1>
              </div>
              <div class="content">
                <p>Hi ${name || 'Trader'},</p>
                
                <p>Great news! Your MT5 account has been successfully connected and is now automatically syncing your trades.</p>
                
                <div class="account-details">
                  <strong>Account Details:</strong><br>
                  Account Number: <strong>${accountNumber}</strong><br>
                  Broker: <strong>${brokerName}</strong><br>
                  Initial Sync: <strong>${tradesCount} trade${tradesCount !== 1 ? 's' : ''} imported</strong>
                </div>
                
                <p><strong>What happens next?</strong></p>
                <ul>
                  <li>✓ Your trades will automatically sync after each trade</li>
                  <li>✓ AI will analyze your trading patterns</li>
                  <li>✓ You'll get insights on your performance</li>
                  <li>✓ Track your progress in real-time</li>
                </ul>
                
                <p>Ready to view your trading dashboard?</p>
                
                <center>
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'https://app.lovableproject.com'}/dashboard" class="cta-button">
                    View Dashboard →
                  </a>
                </center>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                  Keep trading and let us handle the journaling! 📊
                </p>
              </div>
              
              <div class="footer">
                <p>You're receiving this email because you connected an MT5 account to TradeJournal.</p>
                <p>If you didn't initiate this connection, please contact support immediately.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("First sync notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending first sync notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
