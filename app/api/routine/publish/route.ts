import { NextResponse } from "next/server";
import { getRoutineActor, publishRoutineSchema, routineDemoStore } from "@/lib/routine";

export async function POST(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  try {
    const { routine_id } = publishRoutineSchema.parse(await request.json());
    const result = await actor.supabase.rpc("publish_course_routine", { target_routine: routine_id });
    if (!result.error) return NextResponse.json({ routine: result.data });
    if (routineDemoStore.routine?.id !== routine_id) return NextResponse.json({ error: result.error.message }, { status: 404 });
    if (routineDemoStore.routine.status === "published") return NextResponse.json({ routine: routineDemoStore.routine, demo_mode: true });
    const required = routineDemoStore.requirements.reduce((sum, item) => sum + item.sessions_per_week, 0);
    if (routineDemoStore.entries.length !== required) return NextResponse.json({ error: `Routine is incomplete: ${routineDemoStore.entries.length} of ${required} sessions assigned` }, { status: 409 });
    routineDemoStore.routine.status = "published";
    routineDemoStore.routine.published_at = new Date().toISOString();
    return NextResponse.json({ routine: routineDemoStore.routine, demo_mode: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Publish failed" }, { status: 400 }); }
}
