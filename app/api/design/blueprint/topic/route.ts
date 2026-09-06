import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UpdateTopicWeightSchema } from "@/lib/design/schemas";

async function getSupabase() {
  try {
    return createClient();
  } catch {
    return createAdminClient();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UpdateTopicWeightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { topic_id, weight_percent } = parsed.data;
    const targetWeight = Math.min(Math.max(Number(weight_percent) || 0, 0), 100);

    const supabase = await getSupabase();

    // 1. Get the target topic to find blueprint_id
    const { data: targetTopic, error: getErr } = await supabase
      .from("blueprint_topics")
      .select("*")
      .eq("id", topic_id)
      .single();

    if (getErr || !targetTopic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // 2. Fetch all sibling topics for this blueprint
    const { data: siblingTopics, error: sibErr } = await supabase
      .from("blueprint_topics")
      .select("*")
      .eq("blueprint_id", targetTopic.blueprint_id)
      .order("created_at", { ascending: true });

    if (sibErr || !siblingTopics || siblingTopics.length === 0) {
      return NextResponse.json({ error: "No topics found" }, { status: 404 });
    }

    // 3. Proportional re-normalization of other topics
    const otherTopics = siblingTopics.filter((t) => t.id !== topic_id);
    const remainingBudget = Math.max(100 - targetWeight, 0);

    const currentOtherSum = otherTopics.reduce(
      (sum, t) => sum + (Number(t.weight_percent) || 0),
      0
    );

    const updates: Array<{ id: string; weight_percent: number }> = [
      { id: topic_id, weight_percent: targetWeight },
    ];

    for (const ot of otherTopics) {
      const ratio = currentOtherSum > 0 ? (Number(ot.weight_percent) || 0) / currentOtherSum : 1 / otherTopics.length;
      const newWeight = Math.round(ratio * remainingBudget * 10) / 10;
      updates.push({ id: ot.id, weight_percent: newWeight });
    }

    // Perform batch updates
    for (const u of updates) {
      await supabase
        .from("blueprint_topics")
        .update({ weight_percent: u.weight_percent })
        .eq("id", u.id);
    }

    // Fetch refreshed topics
    const { data: refreshedTopics } = await supabase
      .from("blueprint_topics")
      .select("*")
      .eq("blueprint_id", targetTopic.blueprint_id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      success: true,
      topics: refreshedTopics,
      total_weight: 100,
    });
  } catch (err: any) {
    console.error("[PATCH /api/design/blueprint/topic error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update topic weight" },
      { status: 500 }
    );
  }
}
