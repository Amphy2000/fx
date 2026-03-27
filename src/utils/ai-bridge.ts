import { supabase } from "@/integrations/supabase/client";

/**
 * Centrally manages AI calls, preferring Vercel Serverless (Free) over Supabase Edge.
 */
export async function callAI(
    endpoint: string,
    payload: any
): Promise<{ data: any; error: any }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        console.log(`[AI Bridge] Calling Supabase Edge: ${endpoint}`);
        const { data, error } = await supabase.functions.invoke(endpoint, {
            body: payload
        });

        if (error) {
            console.error(`[AI Bridge] Edge Function Error:`, error);
        }

        return { data, error };

    } catch (err: any) {
        console.error(`[AI Bridge] Global failure:`, err);
        return { data: null, error: err };
    }
}
