import { NextResponse } from "next/server";
import { generateRoutine, generateRoutineSchema, getRoutineActor, routineDemoStore } from "@/lib/routine";

export async function POST(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  try {
    const input = generateRoutineSchema.parse(await request.json());
    const { supabase } = actor;
    const [termResult, requirementResult, roomResult, cohortResult, unavailableResult, routinesResult] = await Promise.all([
      supabase.from("academic_terms").select("*").eq("id", input.term_id).single(),
      supabase.from("course_schedule_requirements").select("*").eq("term_id", input.term_id),
      supabase.from("rooms").select("*").eq("is_active", true),
      supabase.from("cohorts").select("*").eq("is_active", true),
      supabase.from("schedule_unavailability").select("*").eq("term_id", input.term_id),
      supabase.from("course_routines").select("id,status").eq("term_id", input.term_id).maybeSingle(),
    ]);
    const demoMode = Boolean(termResult.error || requirementResult.error || roomResult.error || cohortResult.error || unavailableResult.error || routinesResult.error);
    const term = demoMode ? routineDemoStore.terms.find((item) => item.id === input.term_id) : termResult.data;
    const requirements = demoMode ? routineDemoStore.requirements.filter((item) => item.term_id === input.term_id) : requirementResult.data ?? [];
    const rooms = demoMode ? routineDemoStore.rooms : roomResult.data ?? [];
    const cohorts = demoMode ? routineDemoStore.cohorts : cohortResult.data ?? [];
    const unavailable = demoMode ? routineDemoStore.unavailable.filter((item) => item.term_id === input.term_id) : unavailableResult.data ?? [];
    if (!term) return NextResponse.json({ error: "Academic term not found" }, { status: 404 });
    if (!requirements.length) return NextResponse.json({ error: "Add at least one course requirement before generation" }, { status: 400 });
    if (!rooms.length || !cohorts.length) return NextResponse.json({ error: "Active rooms and cohorts are required" }, { status: 400 });
    if ((demoMode ? routineDemoStore.routine?.status : routinesResult.data?.status) === "published") return NextResponse.json({ error: "Published routine is locked" }, { status: 409 });

    let occupied: any[] = [];
    if (!demoMode) {
      const entriesResult = await supabase.from("routine_entries").select("*").eq("term_id", input.term_id);
      occupied = (entriesResult.data ?? []).filter((item) => item.routine_id !== routinesResult.data?.id);
    }
    const result = generateRoutine({ term, requirements, rooms, unavailable, occupied, cohortSizes: Object.fromEntries(cohorts.map((item) => [item.id, item.expected_size])) });
    if (!result.feasible) return NextResponse.json(result, { status: 422 });

    if (demoMode) {
      const routine = routineDemoStore.routine ?? { id: crypto.randomUUID(), term_id: term.id, name: input.name, status: "draft" as const };
      Object.assign(routine, { name: input.name, generated_at: new Date().toISOString() });
      routineDemoStore.routine = routine;
      routineDemoStore.entries = result.entries.map((entry) => ({ ...entry, id: crypto.randomUUID(), routine_id: routine.id }));
      return NextResponse.json({ ...result, routine, entries: routineDemoStore.entries, demo_mode: true });
    }

    const rpc = await supabase.rpc("replace_routine_draft", { target_term: input.term_id, routine_name: input.name, entries: result.entries });
    if (rpc.error) throw rpc.error;
    const routineResult = await supabase.from("course_routines").select("*").eq("id", rpc.data).single();
    const entriesResult = await supabase.from("routine_entries").select("*, courses(code,title), rooms(*), cohorts(*), profiles(full_name)").eq("routine_id", rpc.data);
    return NextResponse.json({ ...result, routine: routineResult.data, entries: entriesResult.data ?? [], demo_mode: false });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Routine generation failed" }, { status: 500 }); }
}
