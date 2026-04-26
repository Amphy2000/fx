import { supabase } from "@/integrations/supabase/client";

/**
 * Centrally manages AI calls via Lovable AI Gateway (through Supabase Edge Functions).
 * Vercel fallback removed — Supabase functions now use Lovable AI which has generous limits.
 */
export async function callAI(
    endpoint: 'analyze-trade' | 'trade-chat',
    payload: any
): Promise<{ data: any; error: any }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        console.log(`[AI Bridge] Invoking Supabase Edge: ${endpoint}`);
        const { data, error } = await supabase.functions.invoke(endpoint, {
            body: payload
        });

        if (error) {
            console.error(`[AI Bridge] Edge function error:`, error);
        }

        return { data, error };
    } catch (err: any) {
        console.error(`[AI Bridge] Global failure:`, err);
        return { data: null, error: err };
    }
}
