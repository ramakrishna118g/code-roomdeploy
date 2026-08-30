import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateWithRetry(genAI, params, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await genAI.models.generateContent(params);
    } catch (err) {
      const is503 = err?.status === 503 || err?.message?.includes("UNAVAILABLE");
      const isLastAttempt = attempt === maxRetries;

      if (!is503 || isLastAttempt) throw err;

      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`Gemini 503 on ${params.model}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
