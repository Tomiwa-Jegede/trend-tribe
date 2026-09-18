// src/utils/gemini.js — Groq primary (free, reliable) + Gemini fallback for Frederick/Jegede
const GEMINI_URL = (apiKey) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

async function askGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq API error (${res.status}): ${t}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty response");
  return text;
}

async function askGeminiRaw(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const response = await fetch(GEMINI_URL(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

const askGemini = async (prompt) => {
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  if (!hasGroq && !hasGemini) throw new Error("No AI key set — set GROQ_API_KEY or GEMINI_API_KEY");
  // Try Groq first (free, fast, rarely 503), fallback to Gemini
  if (hasGroq) {
    try {
      return await askGroq(prompt);
    } catch (e) {
      console.warn("[AI Groq failed, falling back to Gemini]", e.message);
      if (!hasGemini) throw e;
    }
  }
  return await askGeminiRaw(prompt);
};
// ─── Vision variant: prompt + one inline image (base64) ────────
const askGeminiVision = async (prompt, imageBase64, mimeType) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
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
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }
  const data2 = await response.json();
  const text2 = data2?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text2) {
    throw new Error("Gemini returned an empty response");
  }
  return text2;
};
module.exports = { askGemini, askGeminiVision };
