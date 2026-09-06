import { z } from "zod";
import { withCache } from "./cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GradeImageOptions<T> {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  prompt: string;
  schema: z.ZodType<T>;
  modelName?: string;
}

/**
 * Multimodal image grading using OpenRouter (Claude 3.5 Sonnet / GPT-4o)
 * with Gemini 1.5 Pro multimodal fallback.
 */
export async function gradeImage<T>({
  imageUrl,
  imageBase64,
  mimeType = "image/jpeg",
  prompt,
  schema,
  modelName = "anthropic/claude-3.5-sonnet",
}: GradeImageOptions<T>): Promise<T> {
  const cacheKeyInput = {
    prompt,
    imageRef: imageUrl || imageBase64?.slice(0, 100),
  };

  return withCache(`vision:${modelName}`, cacheKeyInput, async () => {
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    // Strategy A: OpenRouter Claude 3.5 Sonnet / GPT-4o
    if (openRouterKey && openRouterKey !== "mock-openrouter-key") {
      try {
        const imageContent = imageUrl
          ? { type: "image_url", image_url: { url: imageUrl } }
          : {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            };

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://facultyos.edu",
            "X-Title": "FacultyOS IAPEA",
          },
          body: JSON.stringify({
            model: modelName,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are an academic examiner assistant. Evaluate the provided handwritten exam script strictly against the criteria. Return structured JSON matching the requested schema including total_score, per_criterion breakdown, and overall/region confidence metrics.",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  imageContent,
                ],
              },
            ],
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const content = json.choices[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return schema.parse(parsed);
          }
        }
      } catch (openRouterErr) {
        console.warn(
          "[OpenRouter Vision Call Failed, attempting Gemini fallback]:",
          openRouterErr
        );
      }
    }

    // Strategy B: Gemini 1.5 Pro multimodal fallback
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (geminiKey && geminiKey !== "mock-gemini-key") {
      const ai = new GoogleGenerativeAI(geminiKey);
      const model = ai.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: { responseMimeType: "application/json" },
      });

      const parts: any[] = [{ text: prompt }];

      if (imageBase64) {
        parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        });
      }

      const result = await model.generateContent(parts);
      const rawText = result.response.text();
      const parsed = JSON.parse(rawText);
      return schema.parse(parsed);
    }

    throw new Error(
      "No valid vision provider configured. Please provide OPENROUTER_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in .env.local"
    );
  });
}
