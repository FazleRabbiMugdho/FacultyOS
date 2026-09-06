import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UpdateOutcomeSchema } from "@/lib/design/schemas";

async function getSupabase() {
  try {
    return createClient();
  } catch {
    return createAdminClient();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const outcomeId = params.id;
    if (!outcomeId) {
      return NextResponse.json({ error: "Missing outcome ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateOutcomeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {};
    if (parsed.data.code !== undefined) {
      updatePayload.code = parsed.data.code.toUpperCase();
    }
    if (parsed.data.statement !== undefined) {
      updatePayload.statement = parsed.data.statement;
    }
    if (parsed.data.bloom_level !== undefined) {
      updatePayload.bloom_level = parsed.data.bloom_level;
    }
    if (parsed.data.action_verbs !== undefined) {
      updatePayload.action_verbs = parsed.data.action_verbs;
    }

    const supabase = await getSupabase();
    const { data: updated, error } = await supabase
      .from("course_outcomes")
      .update(updatePayload)
      .eq("id", outcomeId)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/design/outcomes/[id] error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ outcome: updated });
  } catch (err: any) {
    console.error("[PATCH /api/design/outcomes/[id] error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update outcome" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const outcomeId = params.id;
    if (!outcomeId) {
      return NextResponse.json({ error: "Missing outcome ID" }, { status: 400 });
    }

    const supabase = await getSupabase();
    const { error } = await supabase
      .from("course_outcomes")
      .delete()
      .eq("id", outcomeId);

    if (error) {
      console.error("[DELETE /api/design/outcomes/[id] error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted_id: outcomeId });
  } catch (err: any) {
    console.error("[DELETE /api/design/outcomes/[id] error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete outcome" },
      { status: 500 }
    );
  }
}
