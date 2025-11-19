import { encodeBase64Url, decodeBase64Url } from 'https://deno.land/std@0.224.0/encoding/base64url.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publicKeyJwkString = Deno.env.get('VAPID_PUBLIC_KEY');
    
    if (!publicKeyJwkString) {
      throw new Error('VAPID_PUBLIC_KEY not configured');
    }

    console.log('VAPID_PUBLIC_KEY received, length:', publicKeyJwkString.length);

    // Check if it's already in base64url format (legacy) or JWK format (new)
    let publicKey: string;
    
    try {
      // Try to parse as JWK JSON
      const jwk = JSON.parse(publicKeyJwkString);
      console.log('Parsed JWK successfully, kty:', jwk.kty, 'crv:', jwk.crv);
      
      if (!jwk.x || !jwk.y) {
        throw new Error('Invalid JWK: missing x or y coordinates');
      }
      
      // Convert JWK x and y coordinates to base64url format for browser
      const xBytes = decodeBase64Url(jwk.x);
      const yBytes = decodeBase64Url(jwk.y);
      
      console.log('x length:', xBytes.length, 'y length:', yBytes.length);
      
      if (xBytes.length !== 32 || yBytes.length !== 32) {
        throw new Error(`Invalid coordinate lengths: x=${xBytes.length}, y=${yBytes.length}`);
      }
      
      // Create uncompressed public key (0x04 + x + y)
      const publicKeyBytes = new Uint8Array(65);
      publicKeyBytes[0] = 0x04; // Uncompressed point indicator
      publicKeyBytes.set(xBytes, 1);
      publicKeyBytes.set(yBytes, 33);
      
      publicKey = encodeBase64Url(publicKeyBytes);
      console.log('Generated public key, length:', publicKey.length);
    } catch (parseError) {
      // If parsing fails, assume it's already in base64url format (legacy)
      console.log('Using legacy base64url VAPID public key format, error:', parseError);
      publicKey = publicKeyJwkString;
    }

    return new Response(
      JSON.stringify({ publicKey }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in get-vapid-public-key:', error);
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
