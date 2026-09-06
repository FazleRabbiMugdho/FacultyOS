import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateJSON } from "@/lib/ai";

const diagnosisSchema = z.object({
  diagnoses: z.array(z.object({ co_id: z.string(), diagnosis: z.string().max(220) })),
});

type FeedbackFlag = "ok" | "review_teaching" | "review_mapping";

export async function POST(request: Request) {
  const courseId = new URL(request.url).searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: "course_id is required" }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [outcomesResult, questionsResult, scriptsResult, topicsResult] = await Promise.all([
    supabase.from("course_outcomes").select("id, code, statement, bloom_level").eq("course_id", courseId),
    supabase.from("questions").select("id, text, marks, bloom_level, co_id").eq("course_id", courseId),
    supabase.from("exam_scripts").select("id, question_id").eq("course_id", courseId),
    supabase.from("blueprint_topics").select("module, topic, drift, blueprints!inner(course_id)").eq("blueprints.course_id", courseId),
  ]);
  const sourceError = outcomesResult.error || questionsResult.error || scriptsResult.error;
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });

  const outcomes = outcomesResult.data ?? [];
  const questions = questionsResult.data ?? [];
  const scripts = scriptsResult.data ?? [];
  if (!outcomes.length || !scripts.length) {
    return NextResponse.json({ performance: [], message: "Grade scripts to activate CO feedback." });
  }

  const scriptIds = scripts.map((item) => item.id);
  const [gradesResult, arbitrationResult] = await Promise.all([
    supabase.from("grades").select("script_id, question_id, score, is_ai, created_at").in("script_id", scriptIds).order("created_at", { ascending: false }),
    supabase.from("arbitrations").select("script_id, final_score, status").in("script_id", scriptIds),
  ]);
  if (gradesResult.error || arbitrationResult.error) {
    return NextResponse.json({ error: gradesResult.error?.message || arbitrationResult.error?.message }, { status: 500 });
  }

  const finalByScript = new Map(
    (arbitrationResult.data ?? [])
      .filter((item) => item.status === "resolved" && item.final_score !== null)
      .map((item) => [item.script_id, Number(item.final_score)])
  );
  const gradesByScript = new Map<string, typeof gradesResult.data>();
  for (const grade of gradesResult.data ?? []) {
    gradesByScript.set(grade.script_id, [...(gradesByScript.get(grade.script_id) ?? []), grade]);
  }
  const questionById = new Map(questions.map((item) => [item.id, item]));
  const evidenceByCo = new Map<string, Array<{ question_id: string; question: string; percent: number }>>();

  for (const script of scripts) {
    const question = script.question_id ? questionById.get(script.question_id) : undefined;
    if (!question?.co_id || question.marks <= 0) continue;
    const scriptGrades = gradesByScript.get(script.id) ?? [];
    const fallbackGrade = scriptGrades.find((item) => !item.is_ai) ?? scriptGrades.find((item) => item.is_ai);
    const score = finalByScript.get(script.id) ?? (fallbackGrade ? Number(fallbackGrade.score) : null);
    if (score === null) continue;
    evidenceByCo.set(question.co_id, [
      ...(evidenceByCo.get(question.co_id) ?? []),
      { question_id: question.id, question: question.text, percent: Math.min(100, (score / question.marks) * 100) },
    ]);
  }

  const rushedTopics = (topicsResult.data ?? [])
    .filter((item) => Number(item.drift) < -5)
    .map((item) => `${item.module}: ${item.topic}`);
  const performance = outcomes.map((outcome) => {
    const evidence = evidenceByCo.get(outcome.id) ?? [];
    const avgScore = evidence.length ? evidence.reduce((sum, item) => sum + item.percent, 0) / evidence.length : 0;
    const mappedQuestions = questions.filter((item) => item.co_id === outcome.id);
    const weakMappings = mappedQuestions.filter((item) => Math.abs(item.bloom_level - outcome.bloom_level) >= 3);
    const mappingWeak = mappedQuestions.length <= 1 || weakMappings.length / Math.max(1, mappedQuestions.length) >= 0.5;
    let flag: FeedbackFlag = "ok";
    if (evidence.length && avgScore < 50) flag = mappingWeak ? "review_mapping" : "review_teaching";
    const driftContext = rushedTopics.length ? ` Rushed coverage: ${rushedTopics.slice(0, 2).join(", ")}.` : "";
    const diagnosis = flag === "review_mapping"
      ? `Low attainment is concentrated in ${mappedQuestions.length} weakly aligned question(s); review Bloom and CO mapping.`
      : flag === "review_teaching"
        ? `Students average ${avgScore.toFixed(0)}% across ${evidence.length} graded response(s); review delivery and reinforcement.${driftContext}`
        : evidence.length
          ? `Attainment is healthy at ${avgScore.toFixed(0)}% across ${evidence.length} graded response(s).`
          : "No graded evidence is available for this outcome yet.";
    return { co_id: outcome.id, course_id: courseId, code: outcome.code, avg_score: avgScore, question_count: evidence.length, flag, diagnosis, evidence };
  });

  const flagged = performance.filter((item) => item.flag !== "ok");
  if (flagged.length) {
    try {
      const enriched = await generateJSON(
        `Write one concise, evidence-based diagnosis for each flagged course outcome. Do not invent evidence. Input: ${JSON.stringify(flagged)}`,
        diagnosisSchema
      );
      const diagnoses = new Map(enriched.diagnoses.map((item) => [item.co_id, item.diagnosis]));
      performance.forEach((item) => { item.diagnosis = diagnoses.get(item.co_id) || item.diagnosis; });
    } catch {
      // Deterministic diagnoses above keep the feedback loop available offline.
    }
  }

  for (const item of performance) {
    const payload = { co_id: item.co_id, course_id: courseId, avg_score: item.avg_score, question_count: item.question_count, flag: item.flag, diagnosis: item.diagnosis, computed_at: new Date().toISOString() };
    const existing = await supabase.from("co_performance").select("id").eq("course_id", courseId).eq("co_id", item.co_id).maybeSingle();
    if (existing.data) await supabase.from("co_performance").update(payload).eq("id", existing.data.id);
    else await supabase.from("co_performance").insert(payload);
  }

  return NextResponse.json({ performance });
}
