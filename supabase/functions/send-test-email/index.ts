import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    
    console.log(`Sending test email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Amphy AI <onboarding@resend.dev>",
      to: [email],
      subject: "🚀 Test Email from Amphy AI",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Email</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f5f5;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                color: #ffffff;
                margin: 0;
                font-size: 32px;
                font-weight: 700;
              }
              .content {
                padding: 40px 30px;
              }
              .content h2 {
                color: #1a202c;
                margin-top: 0;
                margin-bottom: 20px;
                font-size: 24px;
              }
              .content p {
                color: #4a5568;
                line-height: 1.6;
                margin-bottom: 15px;
                font-size: 16px;
              }
              .features {
                background-color: #f7fafc;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
              }
              .feature-item {
                margin: 15px 0;
                padding-left: 25px;
                position: relative;
              }
              .feature-item:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #667eea;
                font-weight: bold;
                font-size: 18px;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff !important;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                font-size: 16px;
              }
              .footer {
                background-color: #f7fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
              }
              .footer p {
                color: #718096;
                font-size: 14px;
                margin: 5px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 Amphy AI</h1>
              </div>
              
              <div class="content">
                <h2>Test Email Successful!</h2>
                
                <p>Hello there! 👋</p>
                
                <p>This is a test email from your Amphy AI trading journal application. If you're reading this, it means your Resend email integration is working perfectly!</p>
                
                <div class="features">
                  <div class="feature-item">Email delivery is working correctly</div>
                  <div class="feature-item">Your branding looks great</div>
                  <div class="feature-item">HTML formatting is rendering properly</div>
                  <div class="feature-item">Links and buttons are functional</div>
                </div>
                
                <p>Now you can use this email system to send automated notifications to your users, including:</p>
                
                <p>
                  📊 Weekly performance summaries<br>
                  🎯 Trade milestone achievements<br>
                  ⚠️ Important alerts and reminders<br>
                  🎉 Celebration emails for streaks
                </p>
                
                <center>
                  <a href="https://fx.lovable.app/dashboard" class="cta-button">
                    View Your Dashboard →
                  </a>
                </center>
                
                <p style="margin-top: 30px;">Happy trading! 📈</p>
              </div>
              
              <div class="footer">
                <p>This is a test email from Amphy AI.</p>
                <p>Powered by Resend</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Test email sent successfully",
      emailResponse 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending test email:", error);
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

serve(handler);
