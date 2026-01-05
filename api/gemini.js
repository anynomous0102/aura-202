export default async function handler(req, res) {
    // 1. CORS Setup (Allows your site to talk to this function)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle "Options" check for browsers
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. SECURELY GET KEY
    // This looks for the key in Vercel Settings, NOT in this file.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            error: "Server Error: API Key is missing. Go to Vercel > Settings > Environment Variables and add GEMINI_API_KEY, then Redeploy." 
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt, aiName, imageData } = req.body;

    // 3. CORRECT MODEL CONFIGURATION
    // We use 'gemini-1.5-flash' because 'latest' often causes 404 errors on v1beta
    const model = "gemini-1.5-flash"; 
    const apiBase = "https://generativelanguage.googleapis.com/v1beta";

    const parts = [
        { text: `You are ${aiName || "an AI"}. Answer clearly.` },
        { text: prompt }
    ];

    if (imageData) {
        parts.push({
            inlineData: {
                mimeType: imageData.mimeType,
                data: imageData.base64
            }
        });
    }

    try {
        const response = await fetch(
            `${apiBase}/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts }] })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            return res.status(response.status).json({ error: `Google API Error: ${errorData}` });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response content.";
        
        return res.status(200).json({ text });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
