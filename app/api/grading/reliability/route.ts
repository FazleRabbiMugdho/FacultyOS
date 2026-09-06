import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bias, cohensKappa, gradingDemoState, mad } from "@/lib/grading";

function demoReliability(courseId: string) {
  const finalByScript = new Map(gradingDemoState.arbitrations.filter((item) => item.status === "resolved" && item.final_score != null).map((item) => [item.script_id, Number(item.final_score)]));
  const pairs = gradingDemoState.grades.filter((item) => item.is_ai && finalByScript.has(item.script_id)).map((item) => ({ ai: Math.round(item.score), human: Math.round(finalByScript.get(item.script_id)!) }));
  const ai = pairs.map((item) => item.ai); const human = pairs.map((item) => item.human);
  const examinerDeviations = new Map<string, number[]>();
  gradingDemoState.grades.filter((item) => !item.is_ai && item.examiner_id && finalByScript.has(item.script_id)).forEach((item) => examinerDeviations.set(item.examiner_id, [...(examinerDeviations.get(item.examiner_id) ?? []), Number(item.score) - finalByScript.get(item.script_id)!]));
  const profiles = Array.from(examinerDeviations.entries()).map(([examinerId, deviations]) => {
    const leniency = deviations.reduce((sum, value) => sum + value, 0) / deviations.length;
    return { id: `demo-${examinerId}`, examiner_id: examinerId, leniency, samples: deviations.length, calibration_offset: -leniency };
  });
  return { metrics: { id: "demo-metrics", course_id: courseId, kappa: cohensKappa(ai, human), mad: mad(ai, human), bias: bias(ai, human) }, samples: pairs.length, profiles, demo_mode: true };
}

export async function POST(request: Request) {
  const courseId = new URL(request.url).searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: "course_id is required" }, { status: 400 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scripts = await supabase.from("exam_scripts").select("id").eq("course_id", courseId);
  if (scripts.error) {
    return NextResponse.json(demoReliability(courseId));
  }
  const scriptIds = (scripts.data ?? []).map((item) => item.id);
  if (!scriptIds.length) {
    return NextResponse.json(
      gradingDemoState.scripts.some((item) => item.course_id === courseId)
        ? demoReliability(courseId)
        : { metrics: null, samples: 0 }
    );
  }
  const grades = await supabase.from("grades").select("script_id, examiner_id, score, is_ai").in("script_id", scriptIds);
  const arbitrations = await supabase.from("arbitrations").select("script_id, final_score").in("script_id", scriptIds).eq("status", "resolved");
  if (grades.error || arbitrations.error) return NextResponse.json({ error: grades.error?.message || arbitrations.error?.message }, { status: 500 });

  const finalByScript = new Map((arbitrations.data ?? []).filter((item) => item.final_score !== null).map((item) => [item.script_id, Number(item.final_score)]));
  const pairs = (grades.data ?? []).filter((item) => item.is_ai && finalByScript.has(item.script_id)).map((item) => ({ ai: Number(item.score), human: finalByScript.get(item.script_id)! }));
  const ai = pairs.map((item) => Math.round(item.ai));
  const human = pairs.map((item) => Math.round(item.human));
  const metrics = { kappa: cohensKappa(ai, human), mad: mad(ai, human), bias: bias(ai, human) };
  const metricInsert = await supabase.from("reliability_metrics").insert({ course_id: courseId, ...metrics }).select().single();
  if (metricInsert.error) return NextResponse.json({ error: metricInsert.error.message }, { status: 500 });

  const humanGrades = (grades.data ?? []).filter((item) => !item.is_ai && item.examiner_id && finalByScript.has(item.script_id));
  const grouped = new Map<string, number[]>();
  humanGrades.forEach((item) => grouped.set(item.examiner_id!, [...(grouped.get(item.examiner_id!) ?? []), Number(item.score) - finalByScript.get(item.script_id)!]));
  const profiles = [];
  for (const [examinerId, deviations] of Array.from(grouped.entries())) {
    const leniency = deviations.reduce((sum: number, value: number) => sum + value, 0) / deviations.length;
    const payload = { examiner_id: examinerId, leniency, samples: deviations.length, calibration_offset: -leniency, updated_at: new Date().toISOString() };
    const existing = await supabase.from("examiner_bias_profiles").select("id").eq("examiner_id", examinerId).maybeSingle();
    const result = existing.data ? await supabase.from("examiner_bias_profiles").update(payload).eq("id", existing.data.id).select().single() : await supabase.from("examiner_bias_profiles").insert(payload).select().single();
    if (result.data) profiles.push(result.data);
  }
  return NextResponse.json({ metrics: metricInsert.data, samples: pairs.length, profiles });
}