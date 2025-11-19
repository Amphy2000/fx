import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignRequest {
  campaignId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { campaignId }: CampaignRequest = await req.json();
    console.log(`Processing email campaign: ${campaignId}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("email_campaigns")
      .select("*, email_templates(*)")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Update campaign status
    await supabaseClient
      .from("email_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Get recipients based on user segment
    let query = supabaseClient.from("profiles").select("id, email, full_name");
    
    const segment = campaign.user_segment;
    
    // Apply segmentation filters
    if (segment.subscription_tier) {
      query = query.eq("subscription_tier", segment.subscription_tier);
    }
    if (segment.has_trades !== undefined) {
      if (segment.has_trades) {
        query = query.gt("trades_count", 0);
      } else {
        query = query.eq("trades_count", 0);
      }
    }
    if (segment.min_streak) {
      query = query.gte("current_streak", segment.min_streak);
    }

    const { data: recipients, error: recipientsError } = await query;

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    console.log(`Found ${recipients?.length || 0} recipients`);

    const totalRecipients = recipients?.length || 0;
    let sentCount = 0;
    let failedCount = 0;

    // Update total recipients
    await supabaseClient
      .from("email_campaigns")
      .update({ total_recipients: totalRecipients })
      .eq("id", campaignId);

    // Send emails to each recipient
    for (const recipient of recipients || []) {
      if (!recipient.email) {
        failedCount++;
        continue;
      }

      try {
        // Replace template variables
        let htmlContent = campaign.email_templates.html_content;
        let subject = campaign.email_templates.subject;
        
        htmlContent = htmlContent.replace(/{{name}}/g, recipient.full_name || "User");
        htmlContent = htmlContent.replace(/{{email}}/g, recipient.email);
        subject = subject.replace(/{{name}}/g, recipient.full_name || "User");

        // Add tracking pixel for opens
        const trackingPixel = `<img src="${Deno.env.get("SUPABASE_URL")}/functions/v1/track-email-event?campaign_id=${campaignId}&user_id=${recipient.id}&event=open" width="1" height="1" style="display:none;" />`;
        htmlContent += trackingPixel;

        const emailResponse = await resend.emails.send({
          from: "Amphy AI <onboarding@resend.dev>",
          to: [recipient.email],
          subject: subject,
          html: htmlContent,
        });

        // Record the send
        await supabaseClient.from("email_sends").insert({
          campaign_id: campaignId,
          user_id: recipient.id,
          email_address: recipient.email,
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: { resend_id: emailResponse.data?.id },
        });

        sentCount++;
        console.log(`Email sent to ${recipient.email}`);
      } catch (error: any) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        failedCount++;

        // Record failed send
        await supabaseClient.from("email_sends").insert({
          campaign_id: campaignId,
          user_id: recipient.id,
          email_address: recipient.email,
          status: "failed",
          error_message: error.message,
        });
      }
    }

    // Update campaign stats
    await supabaseClient
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    console.log(`Campaign complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: totalRecipients,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending campaign:", error);
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