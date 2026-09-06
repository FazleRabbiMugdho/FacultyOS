import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/gemini";
import { embed } from "@/lib/ai/embeddings";
import { QuestionItemSchema, QuestionItem } from "@/lib/questions/types";
import { z } from "zod";

const RerollRequestSchema = z.object({
  module: z.string(),
  topic: z.string(),
  co_code: z.string(),
  marks: z.number().int().min(1),
  bloom_level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  colliding_skill_signature: z.string(),
  course_code: z.string().optional().default("CS301"),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const {
      module,
      topic,
      co_code,
      marks,
      bloom_level,
      colliding_skill_signature,
      course_code,
    } = RerollRequestSchema.parse(rawBody);

    const prompt = `
You are an Examination Board Author.
Generate a novel replacement question for:
Module: ${module}
Topic: ${topic}
Outcome: ${co_code}
Marks: ${marks}
Bloom Level: ${bloom_level}

### CRITICAL ANTI-COLLISION CONSTRAINT:
The previous question collided with historical papers because it tested:
"${colliding_skill_signature}"

You MUST test an explicitly DIFFERENT technical skill or alternate operation within ${topic} so that this new question is 100% original and will not trigger deduplication!

Return pure valid JSON matching the schema for a single question.
`;

    const generatedQuestion = await generateJSON(prompt, QuestionItemSchema, "gemini-1.5-pro");

    // Generate embedding for replacement question
    try {
      await embed(`${generatedQuestion.text} \nSkill: ${generatedQuestion.skill_signature}`);
    } catch (e) {
      // Non-blocking
    }

    const result: QuestionItem = {
      ...generatedQuestion,
      id: `q_reroll_${Date.now()}`,
      module,
      topic,
      marks,
      bloom_level,
      co_code,
      source: "generated",
    };

    return NextResponse.json({ success: true, question: result });
  } catch (err: any) {
    console.error("[POST /api/questions/dedup/reroll error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to regenerate variant question" },
      { status: 400 }
    );
  }
}
