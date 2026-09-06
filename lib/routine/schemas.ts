import { z } from "zod";

const daySchema = z.number().int().min(0).max(6);
const minuteSchema = z.number().int().min(0).max(1440);

export const termSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3).max(80),
  starts_on: z.string().date(),
  ends_on: z.string().date(),
  teaching_days: z.array(daySchema).min(1),
  day_start_minute: minuteSchema,
  day_end_minute: minuteSchema,
  slot_increment_minutes: z.number().int().refine((value) => value > 0 && 60 % value === 0),
  breaks: z.array(z.object({ start_minute: minuteSchema, end_minute: minuteSchema, label: z.string().optional() })).default([]),
});

export const roomSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(30),
  name: z.string().min(2).max(100),
  capacity: z.number().int().positive(),
  room_type: z.enum(["lecture", "lab", "hybrid"]),
  location: z.string().max(150).optional().nullable(),
  amenities: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

export const cohortSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(30),
  name: z.string().min(2).max(100),
  department: z.string().max(80).optional().nullable(),
  semester: z.number().int().min(1).max(12).optional().nullable(),
  expected_size: z.number().int().positive(),
  is_active: z.boolean().default(true),
});

export const requirementSchema = z.object({
  id: z.string().uuid().optional(),
  term_id: z.string().uuid(),
  course_id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  cohort_id: z.string().uuid(),
  session_type: z.enum(["lecture", "lab", "tutorial"]),
  sessions_per_week: z.number().int().min(1).max(10),
  duration_minutes: z.number().int().min(10).max(360).refine((value) => value % 10 === 0, "Duration must use 10-minute increments"),
  required_room_type: z.enum(["lecture", "lab", "hybrid"]),
  preferred_days: z.array(daySchema).default([]),
  preferred_start_minute: minuteSchema.optional().nullable(),
  preferred_end_minute: minuteSchema.optional().nullable(),
});

export const unavailabilitySchema = z.object({
  id: z.string().uuid().optional(),
  term_id: z.string().uuid(),
  instructor_id: z.string().uuid().optional().nullable(),
  cohort_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  day_of_week: daySchema,
  start_minute: minuteSchema,
  end_minute: minuteSchema,
  reason: z.string().max(200).optional(),
}).refine((value) => [value.instructor_id, value.cohort_id, value.room_id].filter(Boolean).length === 1, "Choose exactly one resource");

export const generateRoutineSchema = z.object({
  term_id: z.string().uuid(),
  name: z.string().min(3).max(100).default("Generated Weekly Routine"),
});

export const routineEntrySchema = z.object({
  id: z.string().uuid().optional(),
  routine_id: z.string().uuid(),
  term_id: z.string().uuid(),
  requirement_id: z.string().uuid(),
  course_id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  cohort_id: z.string().uuid(),
  room_id: z.string().uuid(),
  session_type: z.enum(["lecture", "lab", "tutorial"]),
  session_index: z.number().int().positive(),
  day_of_week: daySchema,
  start_minute: minuteSchema,
  end_minute: minuteSchema,
  source: z.enum(["generated", "manual"]).default("manual"),
  score: z.number().default(0),
  explanation: z.string().max(250).default("Manually assigned to an empty slot."),
});

export const publishRoutineSchema = z.object({ routine_id: z.string().uuid() });
