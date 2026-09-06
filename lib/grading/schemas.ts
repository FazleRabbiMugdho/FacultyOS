import { z } from "zod";

export const criterionScoreSchema = z.object({
  label: z.string().min(1),
  awarded: z.number().min(0),
  max_marks: z.number().positive(),
  reason: z.string().min(1),
  ecf_applied: z.boolean().optional().default(false),
});

export const regionConfidenceSchema = z.object({
  region_label: z.string().min(1),
  bbox_or_step: z.union([z.string(), z.array(z.number())]),
  confidence: z.number().min(0).max(1),
  note: z.string(),
});

export const aiGradeSchema = z.object({
  per_criterion: z.array(criterionScoreSchema).min(1),
  total_score: z.number().min(0),
  confidence: z.number().min(0).max(1),
  region_confidences: z.array(regionConfidenceSchema).default([]),
});

export const rubricCriterionSchema = z.object({
  label: z.string(),
  max_marks: z.number().positive(),
  keywords: z.array(z.string()).optional().default([]),
  partial_credit_rule: z.string().optional().default(""),
  ecf_rule: z.string().optional().default(""),
});

export type AiGrade = z.infer<typeof aiGradeSchema>;
export type RubricCriterion = z.infer<typeof rubricCriterionSchema>;
