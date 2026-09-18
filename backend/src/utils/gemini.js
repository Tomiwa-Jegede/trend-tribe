// src/utils/gemini.js — thin wrapper around the Gemini API for Frederick

const GEMINI_URL = (apiKey) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const askGemini = async (prompt, retries = 2) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(GEMINI_URL(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned an empty response");
      return text;
    }

    const errText = await response.text();
    const is503 = response.status === 503;
    if (is503 && attempt < retries) {
      console.warn(`[Gemini 503 retry ${attempt + 1}/${retries}]`);
      await sleep(1200 + attempt * 800);
      continue;
    }
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }
};
// ─── Vision variant: prompt + one inline image (base64) ────────
const askGeminiVision = async (prompt, imageBase64, mimeType, retries = 2) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(GEMINI_URL(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    });
    if (response.ok) {
      const data2 = await response.json();
      const text2 = data2?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text2) throw new Error("Gemini returned an empty response");
      return text2;
    }
    const errText = await response.text();
    const is503 = response.status === 503;
    if (is503 && attempt < retries) {
      console.warn(`[Gemini vision 503 retry ${attempt + 1}/${retries}]`);
      await sleep(1200 + attempt * 800);
      continue;
    }
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }
};
module.exports = { askGemini, askGeminiVision };
