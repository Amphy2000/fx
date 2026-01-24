import { createClient } from '@supabase/supabase-js';

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { message, messages } = req.body;

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.VITE_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key missing' });
        }

        // Format chat history for Gemini
        const contents = (messages || [])
            .filter((m: any) => m.role !== 'system')
            .slice(-6) // Last 6 only
            .map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        // Add current message if not empty
        if (message) {
            contents.push({ role: 'user', parts: [{ text: message }] });
        }

        // Gemini call with retry
        let reply = "";
        let attempts = 0;

        while (attempts < 3) {
            try {
                const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents,
                        generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
                        systemInstruction: {
                            parts: [{ text: "You are a friendly Forex trading coach named Amphy AI. Be encouraging, concise, and conversational." }]
                        }
                    }),
                });

                if (response.status === 429) {
                    await new Promise(r => setTimeout(r, (attempts + 1) * 3000));
                    attempts++;
                    continue;
                }

                if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

                const data = await response.json();
                reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm thinking... can you ask that again?";
                break;
            } catch (err) {
                attempts++;
                if (attempts >= 3) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        return res.status(200).json({ reply });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error' });
    }
}
