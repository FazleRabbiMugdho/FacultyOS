import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoutineActor, requirementSchema, routineDemoStore } from "@/lib/routine";

export async function POST(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  try {
    const input = requirementSchema.parse(await request.json());
    const result = await actor.supabase.from("course_schedule_requirements").upsert(input, { onConflict: "term_id,course_id,instructor_id,cohort_id,session_type" }).select("*, courses(code,title), profiles(full_name), cohorts(*)").single();
    if (!result.error) return NextResponse.json({ requirement: result.data });
    const requirement = { ...input, id: input.id || crypto.randomUUID() };
    const index = routineDemoStore.requirements.findIndex((item) => item.id === requirement.id);
    if (index >= 0) routineDemoStore.requirements[index] = requirement; else routineDemoStore.requirements.push(requirement);
    return NextResponse.json({ requirement, demo_mode: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid requirement" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
  const result = await actor.supabase.from("course_schedule_requirements").delete().eq("id", id);
  if (result.error) { const index = routineDemoStore.requirements.findIndex((item) => item.id === id); if (index >= 0) routineDemoStore.requirements.splice(index, 1); }
  return NextResponse.json({ success: true, demo_mode: Boolean(result.error) });
}
