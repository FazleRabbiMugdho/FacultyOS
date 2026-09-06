import { z } from "zod";

export const CreateCourseSchema = z.object({
  code: z
    .string()
    .min(2, "Course code must be at least 2 characters")
    .max(20, "Course code must be under 20 characters")
    .trim(),
  title: z
    .string()
    .min(3, "Course title must be at least 3 characters")
    .max(150, "Course title must be under 150 characters")
    .trim(),
  description: z.string().optional().default(""),
  credit_hours: z
    .number()
    .int()
    .min(1, "Credit hours must be at least 1")
    .max(6, "Credit hours cannot exceed 6")
    .default(3),
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;

export const GenerateOutcomesSchema = z.object({
  course_id: z.string().uuid("Invalid course ID format"),
  syllabus_text: z
    .string()
    .min(20, "Syllabus text must be at least 20 characters long"),
});

export type GenerateOutcomesInput = z.infer<typeof GenerateOutcomesSchema>;

export const SingleAIGeneratedOutcomeSchema = z.object({
  code: z
    .string()
    .describe("Course outcome identifier like CO1, CO2, CO3, etc."),
  statement: z
    .string()
    .min(10)
    .describe(
      "Measurable, observable outcome statement stating what the student will be able to perform."
    ),
  bloom_level: z
    .number()
    .int()
    .min(1)
    .max(6)
    .describe(
      "Revised Bloom's Taxonomy Cognitive Level: 1 (Remember), 2 (Understand), 3 (Apply), 4 (Analyze), 5 (Evaluate), 6 (Create)"
    ),
  action_verbs: z
    .array(z.string())
    .min(1)
    .describe(
      "List of action verbs used in this outcome that strictly align with the chosen Bloom level (e.g., Level 3: apply, solve, compute)."
    ),
});

export const AIGeneratedOutcomesSchema = z.object({
  outcomes: z
    .array(SingleAIGeneratedOutcomeSchema)
    .min(4, "Must generate at least 4 course outcomes")
    .max(8, "Cannot generate more than 8 course outcomes"),
});

export type AIGeneratedOutcomesResult = z.infer<
  typeof AIGeneratedOutcomesSchema
>;

export const CreateOutcomeManualSchema = z.object({
  course_id: z.string().uuid(),
  code: z.string().min(1).max(20),
  statement: z.string().min(5),
  bloom_level: z.number().int().min(1).max(6),
  action_verbs: z.array(z.string()).default([]),
});

export const UpdateOutcomeSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  statement: z.string().min(5).optional(),
  bloom_level: z.number().int().min(1).max(6).optional(),
  action_verbs: z.array(z.string()).optional(),
});

export type UpdateOutcomeInput = z.infer<typeof UpdateOutcomeSchema>;

// ==========================================
// Prompt A2: CO–PO Mapping Schemas
// ==========================================

export const GenerateCoPoSchema = z.object({
  course_id: z.string().uuid("Invalid course ID format"),
});

export const SingleCoPoMappingSchema = z.object({
  co_code: z.string().describe("Course Outcome Code, e.g., 'CO1'"),
  po_code: z.string().describe("Program Outcome Code, e.g., 'PO1', 'PO2'"),
  weight: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe(
      "Correlation weight: 1 (Low - recall/foundational), 2 (Medium - application/methods), 3 (High - analysis/design/synthesis)"
    ),
  rationale: z
    .string()
    .optional()
    .describe("Brief justification for this specific correlation"),
});

export const AIGeneratedCoPoSchema = z.object({
  mappings: z
    .array(SingleCoPoMappingSchema)
    .describe(
      "List of non-zero correlations. Must be sparse! Each CO should correlate to only 2-4 POs where genuine correlation exists."
    ),
});

export const UpdateCoPoCellSchema = z.object({
  co_id: z.string().uuid("Invalid CO ID"),
  po_id: z.string().uuid("Invalid PO ID"),
  weight: z
    .number()
    .int()
    .min(0, "Weight must be 0, 1, 2, or 3")
    .max(3, "Weight cannot exceed 3"),
});

export type UpdateCoPoCellInput = z.infer<typeof UpdateCoPoCellSchema>;
