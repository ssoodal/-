import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini client lazy/securely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined!");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Translate API
app.post("/api/translate", async (req: any, res: any) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "한국어 텍스트를 입력해주세요." });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `Translate the following Korean sentence into natural, everyday colloquial expressions in English, Japanese, and Simplified Chinese. Make sure the translations sound like they are spoken by native speakers in a friendly and casual context (unless the original is very formal, in which case keep matching politeness).
Target Text: "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert friendly trilingual translator fluent in Korean, English, Japanese, and Chinese. Turn user requests into natural, everyday expressions suitable for conversation. Provide output strictly conforming to the requested JSON schema. Do not include markdown wraps or anything other than valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            english: {
              type: Type.STRING,
              description: "The natural English translation with appropriate punctuation."
            },
            japanese: {
              type: Type.STRING,
              description: "The natural Japanese translation (in polite or appropriate colloquial standard form) with kanji/kana."
            },
            chinese: {
              type: Type.STRING,
              description: "The natural Simplified Chinese translation in standard friendly conversational expression."
            }
          },
          required: ["english", "japanese", "chinese"]
        }
      }
    });

    const resultText = response.text?.trim() || "{}";
    const resultJson = JSON.parse(resultText);

    res.json({
      status: "success",
      original: text,
      translations: {
        english: resultJson.english || "",
        japanese: resultJson.japanese || "",
        chinese: resultJson.chinese || ""
      }
    });
  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    res.status(500).json({
      error: "번역 과정 중 오류가 발생했습니다.",
      details: error.message || error
    });
  }
});

// Vite middleware flow
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
