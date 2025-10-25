import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests (webhook verification)
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    
    // Verify Telegram secret token for webhook security
    const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    const expectedToken = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
    
    if (!secretToken || secretToken !== expectedToken) {
      console.error("Invalid or missing webhook secret token");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if request has body
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ status: 'ok', message: 'No JSON body' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await req.text();
    if (!text || text.trim() === '') {
      return new Response(JSON.stringify({ status: 'ok', message: 'Empty body' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update = JSON.parse(text);
    console.log("Telegram webhook received:", update);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Handle /start command
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const deepLink = update.message.text.split(' ')[1]; // Get user_id from deep link

      if (deepLink) {
        // Validate UUID format to prevent injection
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(deepLink)) {
          console.error("Invalid user ID format in deep link");
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: "❌ Invalid connection link. Please use the link from your app settings.",
              parse_mode: "Markdown"
            })
          });
          return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify user exists before updating
        const { data: userExists } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('id', deepLink)
          .single();

        if (!userExists) {
          console.error("User not found for deep link");
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: "❌ User not found. Please generate a new connection link from your app settings.",
              parse_mode: "Markdown"
            })
          });
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update user's telegram_chat_id
        const { error } = await supabaseClient
          .from('profiles')
          .update({ 
            telegram_chat_id: chatId.toString(),
            telegram_notifications_enabled: true 
          })
          .eq('id', deepLink);

        if (error) {
          console.error("Error updating profile:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Send confirmation message
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "✅ Your Amphy AI Trade Journal is now connected!\n\nYou'll receive notifications for:\n• New trades logged\n• Weekly summaries every Sunday at 6 PM\n\nYou can toggle notifications in your app settings.",
            parse_mode: "Markdown"
          })
        });
      } else {
        // /start without deep link
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "👋 Welcome to Amphy AI Trade Journal!\n\nTo connect this bot to your account, please use the 'Connect Telegram' button in the app settings.\n\n📱 Visit your app and go to Settings to get your personal connection link.",
            parse_mode: "Markdown"
          })
        });
      }
    } else if (update.message?.text) {
      // Handle any other text message
      const chatId = update.message.chat.id;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "📊 This bot sends you trade notifications and weekly summaries.\n\nCommands:\n/start - Connect your account\n\nManage your notifications in the app settings.",
          parse_mode: "Markdown"
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in telegram-webhook:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
