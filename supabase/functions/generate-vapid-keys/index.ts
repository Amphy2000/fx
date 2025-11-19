import { encodeBase64Url } from 'https://deno.land/std@0.224.0/encoding/base64url.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating VAPID keys...');
    
    // Generate a P-256 ECDSA key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify']
    );

    // Export keys in JWK format
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

    // Convert to base64url for storage
    const privateKeyString = JSON.stringify(privateKeyJwk);
    const publicKeyString = JSON.stringify(publicKeyJwk);

    console.log('VAPID keys generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        privateKey: privateKeyString,
        publicKey: publicKeyString,
        publicKeyBase64: encodeBase64Url(new TextEncoder().encode(publicKeyString)),
        instructions: 'Store these in your Supabase secrets as VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
