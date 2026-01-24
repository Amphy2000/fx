import { createClient } from '@supabase/supabase-js';

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

export default async function handler(req: any, res: any) {
    // 1. Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        // Initialize Supabase to verify user (using public keys from env)
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.VITE_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { tradeId } = req.body;
        if (!tradeId) {
            return res.status(400).json({ error: 'Trade ID required' });
        }

        // Fetch trade data (we use a service role key if available, or just the user's client)
        const { data: trade, error: tradeError } = await supabase
            .from('trades')
            .select('*')
            .eq('id', tradeId)
            .eq('user_id', user.id)
            .single();

        if (tradeError || !trade) {
            return res.status(404).json({ error: 'Trade not found' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key missing in Vercel settings' });
        }

        const prompt = `Analyze this trade briefly (2-3 sentences):
- Pair: ${trade.pair}, Direction: ${trade.direction}
- Entry: ${trade.entry_price}, SL: ${trade.stop_loss || 'Not set'}, TP: ${trade.take_profit || 'Not set'}
- Exit: ${trade.exit_price || 'Open'}, Result: ${trade.result || 'Pending'}
- Emotion Before: ${trade.emotion_before || 'N/A'}, After: ${trade.emotion_after || 'N/A'}
- Notes: ${trade.notes || 'None'}

Give specific feedback on entry, risk management, and emotions.`;

        // Gemini call with retry logic
        let feedback = "";
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            role: "user",
                            parts: [{ text: `Instructions: You are a Forex trading coach. Be concise and actionable.\n\nContext:\n${prompt}` }]
                        }],
                        generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
                    }),
                });

                if (response.status === 429) {
                    const wait = (attempts + 1) * 3000;
                    console.log(`Rate limited, waiting ${wait}ms...`);
                    await new Promise(r => setTimeout(r, wait));
                    attempts++;
                    continue;
                }

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error?.message || `Gemini error: ${response.status}`);
                }

                const data = await response.json();
                feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                break;
            } catch (err: any) {
                attempts++;
                if (attempts >= maxAttempts) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        return res.status(200).json({ feedback });

    } catch (error: any) {
        console.error('Vercel API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error' });
    }
}
