import { GoogleGenerativeAI } from "@google/generative-ai";
import { withCache } from "./cache";

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey === "mock-gemini-key") {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not configured in .env.local"
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generate 768-dimensional vector embedding for a text string using text-embedding-004
 */
export async function embed(text: string): Promise<number[]> {
  return withCache("text-embedding-004", text, async () => {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  });
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    const vector = await embed(text);
    embeddings.push(vector);
  }
  return embeddings;
}
