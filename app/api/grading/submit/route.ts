import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildDifferenceProfile, calculateDelta, classifyDisagreement, DEMO_QUESTION_ID, gradingDemoState } from "@/lib/grading";

const selectionSchema = z.object({ label: z.string(), awarded: z.number().min(0), maxMarks: z.number().positive(), ecfApplied: z.boolean().optional() });
const submitSchema = z.object({
  script_id: z.string().uuid(),
  question_id: z.string().uuid().nullable().optional(),
  examiner_role: z.enum(["E1", "E2", "E3"]),
  total_marks: z.number().positive(),
  selections: z.array(selectionSchema).min(1),
  final_score: z.number().min(0).optional(),
});

export async function POST(request: Request) {
  try {
    const input = submitSchema.parse(await request.json());
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const score = input.selections.reduce((sum, item) => sum + item.awarded, 0);
    const tableCheck = await supabase.from("grading_assignments").select("id").limit(1);
    if (tableCheck.error || input.question_id === DEMO_QUESTION_ID) {
      const currentArbitration = gradingDemoState.arbitrations.find((item) => item.script_id === input.script_id);
      if (input.examiner_role === "E3" && currentArbitration?.status === "resolved") {
        return NextResponse.json({ error: "Final score is locked" }, { status: 409 });
      }
      const grade = { id: crypto.randomUUID(), script_id: input.script_id, examiner_id: user.id, question_id: input.question_id ?? null, score, rubric_selections: input.selections, is_ai: false, confidence: null, region_confidences: null, created_at: new Date().toISOString() };
      gradingDemoState.grades.unshift(grade);
      gradingDemoState.assignments.push({ script_id: input.script_id, examiner_id: user.id, examiner_role: input.examiner_role });
      if (input.examiner_role === "E3") {
        const arbitration = gradingDemoState.arbitrations.find((item) => item.script_id === input.script_id);
        if (!arbitration) throw new Error("No arbitration is pending");
        Object.assign(arbitration, { status: "resolved", final_score: input.final_score ?? score, s3_examiner: user.id });
        return NextResponse.json({ grade, arbitration, demo_mode: true });
      }
      const roles = gradingDemoState.assignments.filter((item) => item.script_id === input.script_id);
      if (!roles.some((item) => item.examiner_role === "E1") || !roles.some((item) => item.examiner_role === "E2")) return NextResponse.json({ grade, waiting_for: input.examiner_role === "E1" ? "E2" : "E1", demo_mode: true });
      const humanGrades = gradingDemoState.grades.filter((item) => item.script_id === input.script_id && !item.is_ai).slice(0, 2);
      const second = humanGrades[0]; const first = humanGrades[1];
      const delta = calculateDelta(first.score, second.score, input.total_marks);
      const profile = buildDifferenceProfile(first.rubric_selections, second.rubric_selections);
      const arbitration = { id: crypto.randomUUID(), script_id: input.script_id, s1: first.score, s2: second.score, delta, final_score: delta <= 10 ? (first.score + second.score) / 2 : null, status: delta > 10 ? "arbitration" : "resolved", disagreement_type: classifyDisagreement(first.rubric_selections, second.rubric_selections), disagreement_profile: profile };
      gradingDemoState.arbitrations.unshift(arbitration);
      return NextResponse.json({ grade, arbitration, demo_mode: true });
    }
    if (input.examiner_role === "E3") {
      const locked = await supabase.from("arbitrations").select("status").eq("script_id", input.script_id).maybeSingle();
      if (locked.data?.status === "resolved") return NextResponse.json({ error: "Final score is locked" }, { status: 409 });
    }
    await supabase.from("grading_assignments").insert({ script_id: input.script_id, examiner_id: user.id, examiner_role: input.examiner_role });
    const grade = await supabase.from("grades").insert({ script_id: input.script_id, examiner_id: user.id, question_id: input.question_id ?? null, score, rubric_selections: input.selections, is_ai: false }).select().single();
    if (grade.error) throw grade.error;

    if (input.examiner_role === "E3") {
      const resolution = await supabase.from("arbitrations").update({ status: "resolved", final_score: input.final_score ?? score, s3_examiner: user.id }).eq("script_id", input.script_id).select().single();
      if (resolution.error) throw resolution.error;
      return NextResponse.json({ grade: grade.data, arbitration: resolution.data });
    }

    const assignments = await supabase.from("grading_assignments").select("examiner_role, examiner_id").eq("script_id", input.script_id).in("examiner_role", ["E1", "E2"]);
    const roles = assignments.data ?? [];
    if (!roles.some((item) => item.examiner_role === "E1") || !roles.some((item) => item.examiner_role === "E2")) {
      return NextResponse.json({ grade: grade.data, waiting_for: input.examiner_role === "E1" ? "E2" : "E1" });
    }

    const humanGrades = await supabase.from("grades").select("score, rubric_selections, created_at").eq("script_id", input.script_id).eq("is_ai", false).order("created_at", { ascending: false }).limit(2);
    if (humanGrades.error || !humanGrades.data || humanGrades.data.length < 2) throw humanGrades.error ?? new Error("Missing examiner grades");
    const second = humanGrades.data[0];
    const first = humanGrades.data[1];
    const delta = calculateDelta(first.score, second.score, input.total_marks);
    const profile = buildDifferenceProfile(first.rubric_selections, second.rubric_selections);
    const disagreementType = classifyDisagreement(first.rubric_selections, second.rubric_selections);
    const status = delta > 10 ? "arbitration" : "resolved";
    const arbitrationData = { script_id: input.script_id, s1: first.score, s2: second.score, delta, final_score: delta <= 10 ? (first.score + second.score) / 2 : null, status, disagreement_type: disagreementType, disagreement_profile: profile };
    const existing = await supabase.from("arbitrations").select("id").eq("script_id", input.script_id).maybeSingle();
    const arbitration = existing.data
      ? await supabase.from("arbitrations").update(arbitrationData).eq("id", existing.data.id).select().single()
      : await supabase.from("arbitrations").insert(arbitrationData).select().single();
    if (arbitration.error) throw arbitration.error;
    return NextResponse.json({ grade: grade.data, arbitration: arbitration.data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Submission failed" }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
