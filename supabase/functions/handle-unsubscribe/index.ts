import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const campaign_id = url.searchParams.get("campaign_id");
    const reason = url.searchParams.get("reason") || "User requested";

    if (!email) {
      return new Response("Email parameter required", { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Record unsubscribe
    const { error: unsubError } = await supabaseClient
      .from("email_unsubscribes")
      .insert({
        email,
        reason,
        campaign_id: campaign_id || null,
      });

    if (unsubError && !unsubError.message.includes("duplicate")) {
      throw unsubError;
    }

    // Update all contacts with this email to unsubscribed status
    await supabaseClient
      .from("email_contacts")
      .update({ status: "unsubscribed" })
      .eq("email", email);

    console.log(`Unsubscribed: ${email}`);

    // Return HTML confirmation page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Unsubscribed Successfully</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .email {
            font-weight: bold;
            color: #667eea;
          }
          .btn {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
          }
          .btn:hover {
            background: #5568d3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ You've been unsubscribed</h1>
          <p>
            The email address <span class="email">${email}</span> has been removed from our mailing list.
          </p>
          <p>
            You will no longer receive marketing emails from us. 
            You may still receive important transactional emails related to your account.
          </p>
          <p>
            We're sorry to see you go. If you change your mind, you can always resubscribe.
          </p>
          <a href="https://fx.lovable.app" class="btn">Return to Homepage</a>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in handle-unsubscribe:", error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Error</title>
        <style>
          body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <p>Sorry, there was an error processing your unsubscribe request.</p>
        <p>${error.message}</p>
      </body>
      </html>
    `;
    
    return new Response(errorHtml, {
      status: 500,
      headers: { "Content-Type": "text/html", ...corsHeaders },
    });
  }
};

serve(handler);
