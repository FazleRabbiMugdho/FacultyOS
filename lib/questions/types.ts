import { z } from "zod";

export const BloomLevelEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
export type BloomLevel = z.infer<typeof BloomLevelEnum>;

export const BloomLevelNames: Record<number, { name: string; category: "lower" | "higher"; variant: "bloom1" | "bloom2" | "bloom3" | "bloom4" | "bloom5" | "bloom6" }> = {
  1: { name: "Remember (L1)", category: "lower", variant: "bloom1" },
  2: { name: "Understand (L2)", category: "lower", variant: "bloom2" },
  3: { name: "Apply (L3)", category: "higher", variant: "bloom3" },
  4: { name: "Analyze (L4)", category: "higher", variant: "bloom4" },
  5: { name: "Evaluate (L5)", category: "higher", variant: "bloom5" },
  6: { name: "Create (L6)", category: "higher", variant: "bloom6" },
};

// Single Question Schema (used for Zod validation on Gemini response and API)
export const QuestionItemSchema = z.object({
  id: z.string().optional(),
  module: z.string().describe("Module name, e.g. Module 1"),
  topic: z.string().describe("Specific topic from blueprint"),
  text: z.string().describe("The exact exam question statement"),
  marks: z.number().int().min(1).describe("Allocated marks"),
  bloom_level: BloomLevelEnum.describe("Revised Bloom's taxonomy level (1-6)"),
  co_id: z.string().optional().describe("Associated Course Outcome ID"),
  co_code: z.string().describe("Course Outcome Code, e.g. CO1"),
  skill_signature: z.string().describe("One-line normalized cognitive skill description"),
  skill_tags: z.array(z.string()).describe("List of 3-5 skill keywords (concept, operation, Bloom verb)"),
  estimated_minutes: z.number().optional().describe("Estimated student time in minutes"),
  source: z.enum(["generated", "historical"]).default("generated"),
});

export type QuestionItem = z.infer<typeof QuestionItemSchema>;

// AI Raw Generation Output Schema
export const GeminiQuestionsOutputSchema = z.object({
  questions: z.array(QuestionItemSchema),
  paper_rationale: z.string().optional().describe("Explanation of mark distribution and cognitive balance"),
});

export type GeminiQuestionsOutput = z.infer<typeof GeminiQuestionsOutputSchema>;

// Request Payload Schema
export const GenerateQuestionsRequestSchema = z.object({
  course_id: z.string().min(1),
  blueprint_id: z.string().optional(),
  total_marks: z.number().int().min(10).max(200).default(50),
  target_lower_order_percent: z.number().min(0).max(100).default(40), // Bloom 1-2
  target_higher_order_percent: z.number().min(0).max(100).default(60), // Bloom 3-6
  exam_title: z.string().optional().default("Mid-Semester Examination"),
  custom_instructions: z.string().optional(),
});

export type GenerateQuestionsRequest = z.infer<typeof GenerateQuestionsRequestSchema>;

// Response Payload Schema
export interface GenerateQuestionsResponse {
  success: boolean;
  questions: QuestionItem[];
  stats: {
    total_marks: number;
    total_questions: number;
    target_lower_ratio: number;
    target_higher_ratio: number;
    actual_lower_ratio: number;
    actual_higher_ratio: number;
    estimated_total_minutes: number;
    module_breakdown: Array<{
      module: string;
      marks: number;
      weight_percent: number;
      question_count: number;
    }>;
    bloom_distribution: Record<number, number>; // level -> marks
  };
  paper_rationale?: string;
  course_id: string;
  blueprint_id?: string;
}
