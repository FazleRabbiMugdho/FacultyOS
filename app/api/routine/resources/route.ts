import { NextResponse } from "next/server";
import { z } from "zod";
import { cohortSchema, getRoutineActor, roomSchema, routineDemoStore, termSchema } from "@/lib/routine";

const requestSchema = z.discriminatedUnion("resource", [
  z.object({ resource: z.literal("term"), data: termSchema }),
  z.object({ resource: z.literal("room"), data: roomSchema }),
  z.object({ resource: z.literal("cohort"), data: cohortSchema }),
]);

export async function POST(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  try {
    const input = requestSchema.parse(await request.json());
    const table = input.resource === "term" ? "academic_terms" : input.resource === "room" ? "rooms" : "cohorts";
    const payload: any = input.data;
    const result = await actor.supabase.from(table).upsert(payload).select().single();
    if (!result.error) return NextResponse.json({ resource: result.data });
    const value = { ...input.data, id: input.data.id || crypto.randomUUID() } as any;
    const collection = input.resource === "term" ? routineDemoStore.terms : input.resource === "room" ? routineDemoStore.rooms : routineDemoStore.cohorts;
    const index = collection.findIndex((item) => item.id === value.id);
    if (index >= 0) (collection as any[])[index] = value; else (collection as any[]).push(value);
    return NextResponse.json({ resource: value, demo_mode: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid resource" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const actor = await getRoutineActor(true);
  if (actor.error) return NextResponse.json({ error: actor.error }, { status: actor.status });
  const { resource, id } = z.object({ resource: z.enum(["term","room","cohort"]), id: z.string().uuid() }).parse(await request.json());
  const table = resource === "term" ? "academic_terms" : resource === "room" ? "rooms" : "cohorts";
  const result = await actor.supabase.from(table).delete().eq("id", id);
  if (result.error) {
    const collection = resource === "term" ? routineDemoStore.terms : resource === "room" ? routineDemoStore.rooms : routineDemoStore.cohorts;
    const index = collection.findIndex((item) => item.id === id); if (index >= 0) collection.splice(index, 1);
  }
  return NextResponse.json({ success: true, demo_mode: Boolean(result.error) });
}
