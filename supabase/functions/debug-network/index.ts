import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const metaKey = Deno.env.get("METAAPI_API_KEY");
  const sbUrl = Deno.env.get("SUPABASE_URL");
  
  const results: any = {
    env: {
      gemini_exists: !!geminiKey,
      meta_exists: !!metaKey,
      sb_url_exists: !!sbUrl,
      gemini_prefix: geminiKey?.substring(0, 5),
    },
    network: {}
  };

  try {
    const ipResp = await fetch("https://api.ipify.org?format=json");
    results.network.ipify = await ipResp.json();
  } catch (e) { results.network.ipify_error = e.message; }

  try {
    const googleResp = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`);
    results.network.google_models_status = googleResp.status;
    results.network.google_models_body = await googleResp.json().catch(() => ({}));
  } catch (e) { results.network.google_error = e.message; }

  return new Response(JSON.stringify(results), { 
    headers: { "Content-Type": "application/json" } 
  });
});
