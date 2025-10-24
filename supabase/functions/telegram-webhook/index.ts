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

  try {
    const update = await req.json();
    console.log("Telegram webhook received:", update);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle /start command
    if (update.message?.text === '/start') {
      const chatId = update.message.chat.id;
      const deepLink = update.message.text.split(' ')[1]; // Get user_id from deep link

      if (deepLink) {
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
        const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "✅ Your Amphy AI Trade Journal is now connected!\n\nYou'll receive notifications for:\n• New trades logged\n• Weekly summaries every Sunday at 6 PM\n\nYou can toggle notifications in your app settings.",
            parse_mode: "Markdown"
          })
        });
      }
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
