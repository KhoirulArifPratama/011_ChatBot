const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const FREE_MODELS = [
    "openrouter/free",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "cognitivecomputations/dolphin3.0-r1-mistral-24b:free"
];

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.redirect("/index.html");
});

app.post(["/api/chat", "/chat"], async (req, res) => {
    try {
        const messages = req.body.messages;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: "Messages harus berupa array"
            });
        }

        const systemPrompt = {
            role: "system",
            content: "Nama kamu adalah TimTam. Kamu adalah asisten virtual AI chatbot yang ramah, sopan, cerdas, dan siap membantu pengguna dengan baik dalam bahasa Indonesia."
        };

        const outboundMessages = [
            systemPrompt,
            ...messages.filter(m => m && m.role !== "system")
        ];

        let response = null;
        let lastErrorText = "";

        // Coba model gratis satu per satu jika terjadi rate-limit (429) atau error upstream
        for (const candidateModel of FREE_MODELS) {
            try {
                response = await fetch(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: candidateModel,
                            models: FREE_MODELS,
                            messages: outboundMessages,
                            temperature: 0.7,
                            max_tokens: 1000,
                            stream: true
                        })
                    }
                );

                if (response.ok) {
                    break;
                }

                lastErrorText = await response.text();
                console.warn(`Model ${candidateModel} gagal (${response.status}):`, lastErrorText);

                if (response.status === 429 || response.status >= 500) {
                    continue;
                } else {
                    break;
                }
            } catch (err) {
                console.warn(`Error request ke ${candidateModel}:`, err.message);
                lastErrorText = err.message;
            }
        }

        if (!response || !response.ok) {
            let friendlyMessage = "Server AI sedang sibuk. Silakan coba kirim pesan beberapa saat lagi.";
            try {
                const parsed = JSON.parse(lastErrorText);
                if (parsed.error && parsed.error.message) {
                    if (parsed.error.code === 429 || lastErrorText.includes("rate-limited")) {
                        friendlyMessage = "Layanan sedang mencapai batas kuota sementara (Rate Limit). Silakan coba lagi dalam beberapa detik.";
                    } else {
                        friendlyMessage = parsed.error.message;
                    }
                }
            } catch (_) {}

            return res.status(response ? response.status : 503).json({
                error: friendlyMessage
            });
        }

        // Header untuk streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;

                const data = trimmedLine.slice(5).trim();
                if (data === "[DONE]") continue;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                        res.write(`data: ${JSON.stringify(content)}\n\n`);
                    }
                } catch (error) {
                    console.error("Gagal parsing streaming data:", error);
                }
            }
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("Server Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Terjadi kesalahan pada server" });
        } else {
            res.write(`data: ${JSON.stringify("Terjadi kesalahan pada server")}\n\n`);
            res.end();
        }
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;
