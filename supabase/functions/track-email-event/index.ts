import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const campaign_id = url.searchParams.get("campaign_id");
    const user_id = url.searchParams.get("user_id");
    const event_type = url.searchParams.get("event") || "open";
    const link_url = url.searchParams.get("url");

    if (!campaign_id || !user_id) {
      throw new Error("Missing required parameters");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get email_send_id
    const { data: emailSend } = await supabaseClient
      .from("email_sends")
      .select("id")
      .eq("campaign_id", campaign_id)
      .eq("user_id", user_id)
      .single();

    if (!emailSend) {
      throw new Error("Email send not found");
    }

    // Check if event already exists (prevent double counting opens)
    if (event_type === "open") {
      const { data: existingEvent } = await supabaseClient
        .from("email_events")
        .select("id")
        .eq("email_send_id", emailSend.id)
        .eq("event_type", "open")
        .single();

      if (existingEvent) {
        // Event already recorded, return pixel
        return new Response(
          new Uint8Array([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80,
            0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04,
            0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
          ]),
          {
            status: 200,
            headers: {
              "Content-Type": "image/gif",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Record the event
    await supabaseClient.from("email_events").insert({
      campaign_id,
      email_send_id: emailSend.id,
      user_id,
      event_type,
      event_data: link_url ? { url: link_url } : {},
    });

    // Update campaign stats
    if (event_type === "open") {
      await supabaseClient.rpc("increment_campaign_stat", {
        campaign_id,
        stat_name: "opened_count",
      });
      
      // Update email_send delivered_at
      await supabaseClient
        .from("email_sends")
        .update({
          delivered_at: new Date().toISOString(),
          status: "delivered",
        })
        .eq("id", emailSend.id);
    } else if (event_type === "click") {
      await supabaseClient.rpc("increment_campaign_stat", {
        campaign_id,
        stat_name: "clicked_count",
      });
    }

    console.log(`Tracked ${event_type} event for campaign ${campaign_id}`);

    // For open events, return a 1x1 transparent GIF
    if (event_type === "open") {
      return new Response(
        new Uint8Array([
          0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80,
          0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04,
          0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01,
          0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "image/gif",
            ...corsHeaders,
          },
        }
      );
    }

    // For click events, redirect to the URL
    if (event_type === "click" && link_url) {
      return Response.redirect(link_url, 302);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error tracking event:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);