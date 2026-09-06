import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoutineActor, overlaps, routineDemoStore, routineEntrySchema } from "@/lib/routine";

function conflictMessage(entries: any[], input: z.infer<typeof routineEntrySchema>) {
  const conflict = entries.find((entry) => entry.id !== input.id && entry.day_of_week === input.day_of_week && overlaps(input.start_minute, input.end_minute, entry.start_minute, entry.end_minute) && (entry.instructor_id === input.instructor_id || entry.room_id === input.room_id || entry.cohort_id === input.cohort_id));
  if (!conflict) return null;
  if (conflict.instructor_id === input.instructor_id) return "Instructor is already occupied in this slot";
  if (conflict.room_id === input.room_id) return "Room is already occupied in this slot";
  return "Cohort is already occupied in this slot";
}

export async function POST(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  try {
    const input = routineEntrySchema.parse(await request.json());
    const routineResult = await actor.supabase.from("course_routines").select("status").eq("id", input.routine_id).maybeSingle();
    const demoMode = Boolean(routineResult.error);
    const status = demoMode ? routineDemoStore.routine?.status : routineResult.data?.status;
    if (status === "published") return NextResponse.json({ error: "Published routine is locked" }, { status: 409 });
    const existing = demoMode ? routineDemoStore.entries : (await actor.supabase.from("routine_entries").select("*").eq("term_id", input.term_id).eq("day_of_week", input.day_of_week)).data ?? [];
    const conflict = conflictMessage(existing, input);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
    if (demoMode) {
      const entry = { ...input, id: input.id || crypto.randomUUID() };
      const index = routineDemoStore.entries.findIndex((item) => item.id === entry.id);
      if (index >= 0) routineDemoStore.entries[index] = entry; else routineDemoStore.entries.push(entry);
      return NextResponse.json({ entry, demo_mode: true });
    }
    const payload = { ...input }; delete payload.id;
    const result = input.id ? await actor.supabase.from("routine_entries").update(payload).eq("id", input.id).select().single() : await actor.supabase.from("routine_entries").insert(payload).select().single();
    if (result.error) return NextResponse.json({ error: result.error.code === "23P01" ? "The selected instructor, room, or cohort became occupied" : result.error.message }, { status: result.error.code === "23P01" ? 409 : 500 });
    return NextResponse.json({ entry: result.data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid entry" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
  const result = await actor.supabase.from("routine_entries").delete().eq("id", id);
  if (result.error) { const index = routineDemoStore.entries.findIndex((item) => item.id === id); if (index >= 0) routineDemoStore.entries.splice(index, 1); }
  return NextResponse.json({ success: true, demo_mode: Boolean(result.error) });
}
