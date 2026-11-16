const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Daftar model gratis — loop failover manual, TANPA kirim array "models"
// ke OpenRouter (OpenRouter hanya izinkan max 3 item, dan itu fitur berbayar)
const FREE_MODELS = [
    "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "cognitivecomputations/dolphin3.0-r1-mistral-24b:free"
];

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get(["/", "/index.html"], (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
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

        // Loop failover — coba satu per satu, TIDAK kirim field "models" ke API
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
                            messages: outboundMessages,
                            temperature: 0.7,
                            max_tokens: 1000,
                            stream: true
                        })
                    }
                );

                if (response.ok) {
                    break; // sukses, lanjut streaming
                }

                lastErrorText = await response.text();
                console.warn(`Model ${candidateModel} gagal (${response.status}):`, lastErrorText);

                if (response.status === 429 || response.status >= 500) {
                    continue; // coba model berikutnya
                } else {
                    break; // error lain (401, 400 dsb) → berhenti
                }
            } catch (err) {
                console.warn(`Error request ke ${candidateModel}:`, err.message);
                lastErrorText = err.message;
                // jaringan error → coba model berikutnya
            }
        }

        if (!response || !response.ok) {
            let friendlyMessage = "Server AI sedang sibuk. Silakan coba kirim pesan beberapa saat lagi.";
            try {
                const parsed = JSON.parse(lastErrorText);
                if (parsed.error && (parsed.error.code === 429 || lastErrorText.includes("rate-limited"))) {
                    friendlyMessage = "Semua model gratis sedang penuh (Rate Limit). Silakan coba lagi dalam beberapa detik.";
                }
            } catch (_) {}

            return res.status(response ? response.status : 503).json({
                error: friendlyMessage
            });
        }

        // Header untuk streaming SSE
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
