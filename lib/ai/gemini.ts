import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { withCache } from "./cache";

function getGeminiClient(): GoogleGenerativeAI {
  let apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey === "mock-gemini-key") {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not configured in .env.local"
    );
  }
  apiKey = apiKey.replace(/^Gemini key:\s*/i, "").trim();
  return new GoogleGenerativeAI(apiKey);
}

export interface ExtractDocumentOptions {
  buffer: Buffer;
  mimeType?: string;
  fileName?: string;
  prompt?: string;
}

/**
 * Multimodal document text extraction for PDF, Images (PNG, JPG, WEBP), Slides, and text files.
 * Uses Gemini 1.5 Flash with base64 inlineData.
 */
export async function extractDocumentText({
  buffer,
  mimeType,
  fileName = "document",
  prompt,
}: ExtractDocumentOptions): Promise<string> {
  const lowerName = fileName.toLowerCase();

  // 1. Plain text / Markdown
  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "text/csv" ||
    mimeType === "application/json" ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv")
  ) {
    return buffer.toString("utf-8");
  }

  // 2. Resolve MIME type for Gemini Multimodal
  let resolvedMime = mimeType;
  if (!resolvedMime || resolvedMime === "application/octet-stream") {
    if (lowerName.endsWith(".pdf")) resolvedMime = "application/pdf";
    else if (lowerName.endsWith(".png")) resolvedMime = "image/png";
    else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) resolvedMime = "image/jpeg";
    else if (lowerName.endsWith(".webp")) resolvedMime = "image/webp";
    else if (lowerName.endsWith(".gif")) resolvedMime = "image/gif";
    else if (lowerName.endsWith(".bmp")) resolvedMime = "image/bmp";
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const base64Data = buffer.toString("base64");

    const defaultPrompt =
      "You are an academic curriculum and lecture analysis assistant. Extract and transcribe the complete textual content, lecture topics, definitions, mathematical formulas, algorithms, diagrams/notes, and exam questions from this document or slide accurately as clean structured text suitable for semantic RAG search and exam blueprint synthesis. Maintain high fidelity to all academic concepts.";

    const inlineMime =
      resolvedMime && (resolvedMime.startsWith("image/") || resolvedMime === "application/pdf")
        ? resolvedMime
        : "application/pdf";

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: inlineMime,
        },
      },
      {
        text: prompt || defaultPrompt,
      },
    ]);

    const extracted = result.response.text();
    if (extracted && extracted.trim().length > 0) {
      return extracted.trim();
    }
  } catch (aiErr: any) {
    console.warn(`[Gemini extraction warning for ${fileName}]:`, aiErr?.message || aiErr);
  }

  // Fallback: extract printable characters
  const rawText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
  const cleaned = rawText.replace(/\s{2,}/g, " ").trim();
  if (cleaned.length > 30) {
    return cleaned;
  }

  return `Transcribed content from document: ${fileName}`;
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
