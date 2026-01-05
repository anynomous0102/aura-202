export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Server API Key is missing." });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt, aiName, imageData } = req.body;
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
            return res.status(response.status).json({ error: errorData });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
        return res.status(200).json({ text });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
