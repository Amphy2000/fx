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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Processing warm-up schedules...");

    // Call the database function to increment limits
    const { error: incrementError } = await supabaseClient.rpc("increment_warmup_limits");

    if (incrementError) {
      console.error("Error incrementing warm-up limits:", incrementError);
      throw incrementError;
    }

    // Get updated schedules
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from("email_warm_up_schedules")
      .select("*")
      .eq("is_active", true);

    if (schedulesError) {
      console.error("Error fetching schedules:", schedulesError);
      throw schedulesError;
    }

    console.log(`Updated ${schedules?.length || 0} active warm-up schedules`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: schedules?.length || 0,
        schedules: schedules,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing warm-up schedules:", error);
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
