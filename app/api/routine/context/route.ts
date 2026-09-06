import { NextResponse } from "next/server";
import { getRoutineActor, routineDemoStore, seedDemoRequirements } from "@/lib/routine";

export async function GET() {
  const actor = await getRoutineActor();
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const { supabase, user, profile } = actor;
  const [terms, rooms, cohorts, courses, profiles, requirements, unavailable, routines] = await Promise.all([
    supabase.from("academic_terms").select("*").order("starts_on", { ascending: false }),
    supabase.from("rooms").select("*").order("code"),
    supabase.from("cohorts").select("*").order("code"),
    supabase.from("courses").select("id, code, title, credit_hours").order("code"),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
    supabase.from("course_schedule_requirements").select("*, courses(code,title), profiles(full_name), cohorts(*)"),
    supabase.from("schedule_unavailability").select("*"),
    supabase.from("course_routines").select("*").order("created_at", { ascending: false }).limit(1),
  ]);
  const base = { user: { id: user!.id, role: profile!.role }, courses: courses.data ?? [], profiles: profiles.data ?? [] };
  const migrationMissing = terms.error || rooms.error || cohorts.error || requirements.error || unavailable.error || routines.error;
  if (migrationMissing) {
    seedDemoRequirements(base.courses[0]?.id, base.profiles[0]?.id || user!.id);
    return NextResponse.json({ ...base, ...routineDemoStore, demo_mode: true });
  }
  const routine = routines.data?.[0] ?? null;
  const entries = routine ? await supabase.from("routine_entries").select("*, courses(code,title), rooms(*), cohorts(*), profiles(full_name)").eq("routine_id", routine.id) : { data: [] };
  return NextResponse.json({ ...base, terms: terms.data ?? [], rooms: rooms.data ?? [], cohorts: cohorts.data ?? [], requirements: requirements.data ?? [], unavailable: unavailable.data ?? [], routine, entries: entries.data ?? [], demo_mode: false });
}
