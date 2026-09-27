import { Router } from "express";
import { genAI, generateWithRetry } from "../config/ai.js";

const router = Router();

router.post("/api/review", async (req, res) => {
  const { code, language } = req.body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "No code provided to review." });
  }

  const prompt = `You are a senior software engineer doing a code review.
Review the following ${language || "code"} snippet. Be specific, structured, friendly, and concise.

Cover, in this order:
1. Bugs or correctness issues (if any)
2. Time/space complexity, if relevant
3. Readability / naming / structure improvements
4. Edge cases not handled
5. One key suggestion to improve it

If the code is already solid, say so plainly instead of inventing issues.

Code:
\`\`\`${language || ""}
${code}
\`\`\`
`;

  const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash"];

  for (const model of modelsToTry) {
    try {
      const response = await generateWithRetry(genAI, { model, contents: prompt });
      const reviewText = response.text || "No response from Gemini.";
      return res.json({ review: reviewText, modelUsed: model });
    } catch (err) {
      console.error(`Gemini error on ${model}:`, err);
      if (err?.status !== 503) {
        return res.status(500).json({ error: "Failed to generate review. Check server logs." });
      }
    }
  }

  res.status(503).json({ error: "Gemini is currently overloaded on all models. Please try again shortly." });
});

router.post("/api/chat", async (req, res) => {
  const { messages, code, language } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No chat messages provided." });
  }

  const systemInstruction = `You are CodeRoom AI, a friendly expert coding assistant.
The user is working on the following ${language || "code"} in their editor:
\`\`\`${language || ""}
${code || ""}
\`\`\`
Help them answer questions, fix bugs, optimize performance, or explain concepts concisely.`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" || m.role === "model" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash"];

  for (const model of modelsToTry) {
    try {
      const response = await generateWithRetry(genAI, {
        model,
        contents,
        config: { systemInstruction },
      });
      const replyText = response.text || "No response from Gemini.";
      return res.json({ reply: replyText, modelUsed: model });
    } catch (err) {
      console.error(`Gemini chat error on ${model}:`, err);
      if (err?.status !== 503) {
        return res.status(500).json({ error: "Failed to generate AI chat response." });
      }
    }
  }

  res.status(503).json({ error: "Gemini is currently overloaded. Please try again shortly." });
});

export default router;
