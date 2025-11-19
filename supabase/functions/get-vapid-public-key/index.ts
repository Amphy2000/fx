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

    let publicKey: string;
    
    try {
      // First, try to parse as plain JWK JSON
      const jwk = JSON.parse(publicKeyJwkString);
      console.log('Parsed as plain JWK successfully');
      
      if (!jwk.x || !jwk.y) {
        throw new Error('Invalid JWK: missing x or y coordinates');
      }
      
      // Convert JWK x and y coordinates to base64url format for browser
      const xBytes = decodeBase64Url(jwk.x);
      const yBytes = decodeBase64Url(jwk.y);
      
      if (xBytes.length !== 32 || yBytes.length !== 32) {
        throw new Error(`Invalid coordinate lengths: x=${xBytes.length}, y=${yBytes.length}`);
      }
      
      // Create uncompressed public key (0x04 + x + y)
      const publicKeyBytes = new Uint8Array(65);
      publicKeyBytes[0] = 0x04;
      publicKeyBytes.set(xBytes, 1);
      publicKeyBytes.set(yBytes, 33);
      
      publicKey = encodeBase64Url(publicKeyBytes);
      console.log('Generated public key from JWK, length:', publicKey.length);
    } catch (parseError) {
      console.log('Failed to parse as plain JWK, trying base64url-encoded JWK:', parseError);
      
      try {
        // Try to decode as base64url-encoded JWK
        const decodedBytes = decodeBase64Url(publicKeyJwkString);
        const decodedString = new TextDecoder().decode(decodedBytes);
        console.log('Decoded base64url to string, length:', decodedString.length);
        
        const jwk = JSON.parse(decodedString);
        console.log('Parsed decoded JWK successfully');
        
        if (!jwk.x || !jwk.y) {
          throw new Error('Invalid JWK: missing x or y coordinates');
        }
        
        const xBytes = decodeBase64Url(jwk.x);
        const yBytes = decodeBase64Url(jwk.y);
        
        if (xBytes.length !== 32 || yBytes.length !== 32) {
          throw new Error(`Invalid coordinate lengths: x=${xBytes.length}, y=${yBytes.length}`);
        }
        
        const publicKeyBytes = new Uint8Array(65);
        publicKeyBytes[0] = 0x04;
        publicKeyBytes.set(xBytes, 1);
        publicKeyBytes.set(yBytes, 33);
        
        publicKey = encodeBase64Url(publicKeyBytes);
        console.log('Generated public key from base64url-encoded JWK, length:', publicKey.length);
      } catch (decodeError) {
        // Last resort: assume it's already in the correct 87-char format
        console.log('Using as-is, assuming legacy 87-char format:', decodeError);
        publicKey = publicKeyJwkString;
      }
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
