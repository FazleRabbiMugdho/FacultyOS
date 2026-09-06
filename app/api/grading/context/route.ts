import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { demoContext } from "@/lib/grading";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [questions, scripts, grades, arbitrations] = await Promise.all([
    supabase.from("questions").select("id, course_id, text, marks, rubrics(id, criteria, total_marks)").order("created_at", { ascending: false }),
    supabase.from("exam_scripts").select("*").order("created_at", { ascending: false }),
    supabase.from("grades").select("*").order("created_at", { ascending: false }),
    supabase.from("arbitrations").select("*").order("created_at", { ascending: false }),
  ]);

  const error = questions.error || scripts.error || grades.error || arbitrations.error;
  if (error) return NextResponse.json(demoContext());

  if (!questions.data?.length) {
    const demo = demoContext();
    return NextResponse.json({
      ...demo,
      scripts: [...(scripts.data ?? []), ...demo.scripts],
      grades: [...(grades.data ?? []), ...demo.grades],
      arbitrations: [...(arbitrations.data ?? []), ...demo.arbitrations],
    });
  }

  return NextResponse.json({
    questions: questions.data ?? [],
    scripts: scripts.data ?? [],
    grades: grades.data ?? [],
    arbitrations: arbitrations.data ?? [],
  });
}
