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
    const { trade } = await req.json();
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get user's telegram settings
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', user.id)
      .single();

    if (!profile?.telegram_notifications_enabled || !profile?.telegram_chat_id) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format trade notification
    const profitLossEmoji = trade.result === 'win' ? '✅' : trade.result === 'loss' ? '❌' : '⏳';
    const directionEmoji = trade.direction === 'buy' ? '🟢' : '🔴';
    
    let message = `${profitLossEmoji} *New Trade Logged*\n\n`;
    message += `${directionEmoji} *${trade.pair}* - ${trade.direction.toUpperCase()}\n`;
    message += `📊 Entry: ${trade.entry_price}\n`;
    
    if (trade.exit_price) {
      message += `📊 Exit: ${trade.exit_price}\n`;
    }
    
    if (trade.profit_loss) {
      const plSign = trade.profit_loss >= 0 ? '+' : '';
      message += `💰 P/L: ${plSign}${trade.profit_loss}\n`;
    }
    
    if (trade.emotion_before || trade.emotion_after) {
      message += `\n😊 Emotions:\n`;
      if (trade.emotion_before) message += `Before: ${trade.emotion_before}\n`;
      if (trade.emotion_after) message += `After: ${trade.emotion_after}\n`;
    }

    // Send to Telegram
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: message,
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      console.error("Telegram API error:", await response.text());
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-telegram-notification:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
