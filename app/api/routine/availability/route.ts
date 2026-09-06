import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoutineActor, routineDemoStore, unavailabilitySchema } from "@/lib/routine";

export async function POST(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  try {
    const input = unavailabilitySchema.parse(await request.json());
    const result = await actor.supabase.from("schedule_unavailability").insert(input).select().single();
    if (!result.error) return NextResponse.json({ unavailable: result.data });
    const unavailable = { ...input, id: crypto.randomUUID() };
    routineDemoStore.unavailable.push(unavailable);
    return NextResponse.json({ unavailable, demo_mode: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid unavailable period" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
  const result = await actor.supabase.from("schedule_unavailability").delete().eq("id", id);
  if (result.error) { const index = routineDemoStore.unavailable.findIndex((item) => item.id === id); if (index >= 0) routineDemoStore.unavailable.splice(index, 1); }
  return NextResponse.json({ success: true, demo_mode: Boolean(result.error) });
}
