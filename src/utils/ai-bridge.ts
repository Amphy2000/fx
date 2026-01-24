import { supabase } from "@/integrations/supabase/client";

/**
 * Centrally manages AI calls, preferring Vercel Serverless (Free) over Supabase Edge.
 */
export async function callAI(
    endpoint: 'analyze-trade' | 'trade-chat',
    payload: any
): Promise<{ data: any; error: any }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        // 1. Try Vercel API first (Free, no credit limit)
        console.log(`[AI Bridge] Attempting Vercel API: /api/${endpoint}`);
        const vResponse = await fetch(`/api/${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`
            },
            body: JSON.stringify(payload)
        });

        if (vResponse.ok) {
            const data = await vResponse.json();
            console.log(`[AI Bridge] Success via Vercel: /api/${endpoint}`);
            return { data, error: null };
        }

        // 2. Handle specific errors
        if (vResponse.status === 404) {
            console.warn(`[AI Bridge] Vercel API /api/${endpoint} not found. Falling back to Supabase...`);
        } else {
            const errData = await vResponse.json();
            console.error(`[AI Bridge] Vercel Error (${vResponse.status}):`, errData);

            if (errData.error?.includes('Gemini API Key missing')) {
                return { data: null, error: { message: "GEMINI_API_KEY is not set in Vercel dashboard." } };
            }
        }

        // 3. Fallback to Supabase Edge Functions (Uses Lovable Credits)
        console.log(`[AI Bridge] Falling back to Supabase Edge: ${endpoint}`);
        const { data, error } = await supabase.functions.invoke(endpoint, {
            body: payload
        });

        return { data, error };

    } catch (err: any) {
        console.error(`[AI Bridge] Global failure:`, err);
        return { data: null, error: err };
    }
}
