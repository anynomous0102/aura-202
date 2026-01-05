export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { prompt, aiName, imageData } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "API key not configured" });
        }

        const endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
            apiKey;

        const body = {
            contents: [
                {
                    role: "user",
                    parts: imageData
                        ? [
                              {
                                  inlineData: {
                                      mimeType: imageData.mimeType,
                                      data: imageData.base64
                                  }
                              },
                              { text: prompt }
                          ]
                        : [{ text: prompt }]
                }
            ]
        };

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({
                error: data.error?.message || "Gemini API error"
            });
        }

        const text =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No response generated.";

        return res.status(200).json({ text });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
}
