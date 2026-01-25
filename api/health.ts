// Simple diagnostic endpoint to verify Vercel setup
export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const diagnostics = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'unknown',
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
        hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
        availableEnvVars: Object.keys(process.env).filter(k =>
            k.includes('GEMINI') || k.includes('SUPABASE') || k.includes('VITE')
        )
    };

    return res.status(200).json({
        status: 'API is working!',
        diagnostics
    });
}
