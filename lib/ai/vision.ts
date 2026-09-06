import { z } from "zod";
import { withCache } from "./cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

function parseJsonResponse(content: string) {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(normalized);
}

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
  modelName = process.env.OPENROUTER_VISION_MODEL || "~anthropic/claude-sonnet-latest",
}: GradeImageOptions<T>): Promise<T> {
  const cacheKeyInput = {
    prompt,
    imageRef: imageUrl || imageBase64?.slice(0, 100),
  };

  return withCache(`vision:${modelName}`, cacheKeyInput, async () => {
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    // Strategy A: OpenRouter Claude 3.5 Sonnet / GPT-4o
    if (openRouterKey && openRouterKey !== "mock-openrouter-key") {
      for (const candidateModel of [modelName, "openai/gpt-4o"]) {
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
            model: candidateModel,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "academic_grade",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["per_criterion", "total_score", "confidence", "region_confidences"],
                  properties: {
                    per_criterion: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["label", "awarded", "max_marks", "reason", "ecf_applied"],
                        properties: {
                          label: { type: "string" },
                          awarded: { type: "number" },
                          max_marks: { type: "number" },
                          reason: { type: "string" },
                          ecf_applied: { type: "boolean" },
                        },
                      },
                    },
                    total_score: { type: "number" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    region_confidences: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["region_label", "bbox_or_step", "confidence", "note"],
                        properties: {
                          region_label: { type: "string" },
                          bbox_or_step: { type: "string" },
                          confidence: { type: "number", minimum: 0, maximum: 1 },
                          note: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            messages: [
              {
                role: "system",
                content:
                  "You are an academic examiner assistant. Evaluate the provided handwritten exam script strictly against the criteria. Return only the structured JSON required by the supplied response schema.",
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
            const parsed = parseJsonResponse(content);
            return schema.parse(parsed);
          }
        } else {
          const errorBody = await res.text();
          console.warn(`[OpenRouter ${candidateModel} failed]: ${res.status} ${errorBody}`);
        }
        } catch (openRouterErr) {
          console.warn(`[OpenRouter ${candidateModel} failed]:`, openRouterErr);
        }
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
      const parsed = parseJsonResponse(rawText);
      return schema.parse(parsed);
    }

    throw new Error(
      "No valid vision provider configured. Please provide OPENROUTER_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in .env.local"
    );
  });
}
