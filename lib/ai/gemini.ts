import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
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
 * Generate freeform text using Gemini 1.5 Flash
 */
export async function generateText(
  prompt: string,
  modelName: string = "gemini-1.5-flash"
): Promise<string> {
  return withCache(modelName, prompt, async () => {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({ model: modelName });
    const response = await model.generateContent(prompt);
    return response.response.text();
  });
}

/**
 * Generate typed, schema-validated JSON using Gemini 1.5 Pro with retry
 */
export async function generateJSON<T>(
  prompt: string,
  schema: z.ZodType<T>,
  modelName: string = "gemini-1.5-pro"
): Promise<T> {
  return withCache(`${modelName}:json`, prompt, async () => {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let attempts = 0;
    const maxAttempts = 2;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await model.generateContent(prompt);
        const rawText = response.response.text();
        const parsed = JSON.parse(rawText);
        const validated = schema.parse(parsed);
        return validated;
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[Gemini JSON Attempt ${attempts}/${maxAttempts} Failed]:`,
          err?.message || err
        );
      }
    }

    throw new Error(
      `Failed to generate valid JSON against schema after ${maxAttempts} attempts: ${
        lastError?.message || "Unknown error"
      }`
    );
  });
}
