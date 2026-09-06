import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { gradeImage } from "@/lib/ai";
import { aiGradeSchema, gradingDemoState, rubricCriterionSchema } from "@/lib/grading";

const requestSchema = z.object({
  course_id: z.string().uuid(),
  question_id: z.string().uuid(),
  student_masked_id: z.string().min(1),
  image_base64: z.string().min(100),
  mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  rubric: z.array(rubricCriterionSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const totalMarks = input.rubric.reduce((sum, item) => sum + item.max_marks, 0);
    const evaluation = await gradeImage({
      imageBase64: input.image_base64,
      mimeType: input.mime_type,
      schema: aiGradeSchema,
      prompt: `Grade this handwritten answer image directly against the rubric below. Do not transcribe it as a separate OCR step. Award no more than ${totalMarks} marks. Apply partial credit and error-carried-forward rules. Return confidence per answer region or formula. Rubric: ${JSON.stringify(input.rubric)}`,
    });

    const safeScore = Math.min(totalMarks, evaluation.total_score);
    let script: any;
    let grade: any;
    let demoMode = false;
    try {
      const extension = input.mime_type.split("/")[1];
      const storagePath = `${input.course_id}/${crypto.randomUUID()}.${extension}`;
      const bytes = Uint8Array.from(Buffer.from(input.image_base64, "base64"));
      const upload = await supabase.storage.from("scripts").upload(storagePath, bytes, { contentType: input.mime_type, upsert: false });
      if (upload.error) throw upload.error;
      const scriptResult = await supabase.from("exam_scripts").insert({ course_id: input.course_id, question_id: input.question_id, student_masked_id: input.student_masked_id, storage_path: storagePath, anonymized: true }).select().single();
      if (scriptResult.error) throw scriptResult.error;
      script = scriptResult.data;
      const gradeResult = await supabase.from("grades").insert({ script_id: script.id, question_id: input.question_id, score: safeScore, rubric_selections: evaluation.per_criterion, is_ai: true, confidence: evaluation.confidence, region_confidences: evaluation.region_confidences }).select().single();
      if (gradeResult.error) throw gradeResult.error;
      grade = gradeResult.data;
    } catch {
      demoMode = true;
      script = { id: crypto.randomUUID(), course_id: input.course_id, question_id: input.question_id, student_masked_id: input.student_masked_id, storage_path: null, anonymized: true, created_at: new Date().toISOString() };
      grade = { id: crypto.randomUUID(), script_id: script.id, question_id: input.question_id, examiner_id: null, score: safeScore, rubric_selections: evaluation.per_criterion, is_ai: true, confidence: evaluation.confidence, region_confidences: evaluation.region_confidences, created_at: new Date().toISOString() };
      gradingDemoState.scripts.unshift(script);
      gradingDemoState.grades.unshift(grade);
    }

    const regionConfidences = evaluation.region_confidences ?? [];
    const lowConfidenceRegions = regionConfidences.filter((region) => region.confidence < 0.85);
    return NextResponse.json({
      script,
      grade,
      demo_mode: demoMode,
      needs_manual_review: evaluation.confidence < 0.85 || lowConfidenceRegions.length > 0,
      low_confidence_regions: lowConfidenceRegions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI grading failed";
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}

export async function PATCH(request: Request) {
  const schema = z.object({ grade_id: z.string().uuid(), score: z.number().min(0), rubric_selections: z.array(z.unknown()) });
  try {
    const input = schema.parse(await request.json());
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const demoGrade = gradingDemoState.grades.find((item) => item.id === input.grade_id);
    if (demoGrade) {
      const override = { ...demoGrade, id: crypto.randomUUID(), examiner_id: user.id, score: input.score, rubric_selections: input.rubric_selections, is_ai: false, confidence: null, created_at: new Date().toISOString() };
      gradingDemoState.grades.unshift(override);
      return NextResponse.json({ grade: override, demo_mode: true });
    }
    const original = await supabase.from("grades").select("script_id, question_id").eq("id", input.grade_id).single();
    if (original.error) throw original.error;
    const result = await supabase.from("grades").insert({
      script_id: original.data.script_id,
      question_id: original.data.question_id,
      examiner_id: user.id,
      score: input.score,
      rubric_selections: input.rubric_selections,
      is_ai: false,
    }).select().single();
    if (result.error) throw result.error;
    return NextResponse.json({ grade: result.data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Override failed" }, { status: 400 });
  }
}
