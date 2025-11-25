import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowRequest {
  trigger_type: string;
  user_id: string;
  data: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trigger_type, user_id, data }: WorkflowRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing workflow for trigger: ${trigger_type}, user: ${user_id}`);

    // Fetch active workflows for this trigger type
    const { data: workflows, error: workflowError } = await supabase
      .from("email_workflows")
      .select("*, email_templates(*)")
      .eq("trigger_type", trigger_type)
      .eq("is_active", true);

    if (workflowError) {
      console.error("Error fetching workflows:", workflowError);
      throw workflowError;
    }

    if (!workflows || workflows.length === 0) {
      console.log(`No active workflows found for trigger: ${trigger_type}`);
      return new Response(
        JSON.stringify({ message: "No active workflows found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching profile or email not found:", profileError);
      throw new Error("User email not found");
    }

    const results = [];

    for (const workflow of workflows) {
      try {
        // Check if we've already sent this workflow to this user recently
        const { data: existingExecution } = await supabase
          .from("email_workflow_executions")
          .select("id")
          .eq("workflow_id", workflow.id)
          .eq("user_id", user_id)
          .eq("status", "sent")
          .gte("executed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .single();

        if (existingExecution) {
          console.log(`Workflow ${workflow.id} already sent to user ${user_id} recently`);
          continue;
        }

        const template = workflow.email_templates;
        if (!template) {
          console.error(`No template found for workflow ${workflow.id}`);
          continue;
        }

        // Personalize email content
        let htmlContent = template.html_content;
        let subject = template.subject;

        // Replace variables
        const variables = {
          name: profile.full_name || "there",
          email: profile.email,
          ...data,
        };

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, "g");
          htmlContent = htmlContent.replace(regex, String(value));
          subject = subject.replace(regex, String(value));
        });

        // Send email
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Amphy AI <amphyai@outlook.com>",
            to: [profile.email],
            subject: subject,
            html: htmlContent,
          }),
        });

        if (!emailResponse.ok) {
          throw new Error(`Failed to send email: ${emailResponse.statusText}`);
        }

        const emailData = await emailResponse.json();
        console.log("Email sent:", emailData);

        // Log execution
        const { error: logError } = await supabase
          .from("email_workflow_executions")
          .insert({
            workflow_id: workflow.id,
            user_id: user_id,
            status: "sent",
            executed_at: new Date().toISOString(),
          });

        if (logError) {
          console.error("Error logging execution:", logError);
        }

        // Update workflow sent count
        await supabase
          .from("email_workflows")
          .update({ sent_count: (workflow.sent_count || 0) + 1 })
          .eq("id", workflow.id);

        results.push({
          workflow_id: workflow.id,
          status: "sent",
          email_id: emailData.id,
        });
      } catch (error: any) {
        console.error(`Error processing workflow ${workflow.id}:`, error);

        // Log failed execution
        await supabase
          .from("email_workflow_executions")
          .insert({
            workflow_id: workflow.id,
            user_id: user_id,
            status: "failed",
            error_message: error.message,
            executed_at: new Date().toISOString(),
          });

        results.push({
          workflow_id: workflow.id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in process-email-workflow:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
