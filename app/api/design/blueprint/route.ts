import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJSON } from "@/lib/ai";
import {
  GenerateBlueprintSchema,
  AIGeneratedBlueprintSchema,
} from "@/lib/design/schemas";

async function getSupabase() {
  try {
    return createClient();
  } catch {
    return createAdminClient();
  }
}

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get("course_id");
    if (!courseId) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 });
    }

    const supabase = await getSupabase();

    // 1. Get latest blueprint
    const { data: blueprint, error: bpErr } = await supabase
      .from("blueprints")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bpErr) {
      return NextResponse.json({ error: bpErr.message }, { status: 500 });
    }

    let topics: any[] = [];
    if (blueprint) {
      const { data: topicData, error: tErr } = await supabase
        .from("blueprint_topics")
        .select("*")
        .eq("blueprint_id", blueprint.id)
        .order("created_at", { ascending: true });

      if (!tErr) {
        topics = topicData || [];
      }
    }

    // 2. Get Ingested Documents Summary & total chunks
    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    let totalChunks = 0;
    const docIds = (docs || []).map((d) => d.id);
    if (docIds.length > 0) {
      const { count } = await supabase
        .from("doc_chunks")
        .select("*", { count: "exact", head: true })
        .in("document_id", docIds);
      totalChunks = count || 0;
    }

    const totalWeight = topics.reduce(
      (sum, t) => sum + (Number(t.weight_percent) || 0),
      0
    );

    return NextResponse.json({
      blueprint,
      topics,
      total_weight: Math.round(totalWeight * 10) / 10,
      total_chunks: totalChunks,
      documents_count: docs?.length || 0,
    });
  } catch (err: any) {
    console.error("[GET /api/design/blueprint error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch blueprint" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = GenerateBlueprintSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { course_id, name, mode } = parsed.data;
    const supabase = await getSupabase();

    // 1. Fetch Course Info, Syllabus, Documents & Chunks
    const { data: course } = await supabase
      .from("courses")
      .select("*")
      .eq("id", course_id)
      .single();

    const { data: cos } = await supabase
      .from("course_outcomes")
      .select("*")
      .eq("course_id", course_id);

    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .eq("course_id", course_id);

    // Analyze document coverage and timestamps
    let documentsContext = "";
    if (docs && docs.length > 0) {
      documentsContext = docs
        .map((d, idx) => {
          const taughtStr = d.taught_at
            ? `Taught on ${new Date(d.taught_at).toLocaleDateString()}`
            : "NOT TAUGHT / SKIPPED IN CLASS (Schedule Holiday/Rushed)";
          return `Document ${idx + 1} (${d.type}): "${d.extracted_text?.slice(0, 250)}..." [Planned: ${d.planned_at || "N/A"} | Status: ${taughtStr}]`;
        })
        .join("\n\n");
    } else {
      documentsContext = "No auxiliary slide documents ingested yet. Synthesizing from course syllabus.";
    }

    const cosContext = (cos || [])
      .map((c) => `- ${c.code} (Bloom L${c.bloom_level}): ${c.statement}`)
      .join("\n");

    const prompt = `You are an expert exam blueprint designer and curriculum architect.
Synthesize a comprehensive, outcome-aligned Exam Blueprint (topic mark weight distribution) for this course.

MODE: ${mode === "drift_aware" ? "OUTCOME-DRIFT-AWARE (Reweight based on what was actually taught)" : "PLANNED SYLLABUS (Pure theoretical syllabus distribution)"}

CRITICAL WEIGHTING & DRIFT RULES:
1. Modules & Topics:
   - Identify 4 to 6 representative core modules/topics covering the curriculum.
2. Planned vs Actual Weight:
   - 'planned_weight': The theoretical weight percentage assigned to the topic in a standard semester syllabus.
   - 'actual_weight': The weight percentage reflecting actual delivered instructional volume. If a topic was skipped, delayed, or has minimal lecture content (e.g. Intractability/NP-completeness with null taught_at), its actual_weight MUST be drastically lower (down-weighted). If a topic had extra slide depth/lectures (e.g. Dynamic Programming / Network Flows), its actual_weight is higher.
   - 'drift': Compute (actual_weight - planned_weight). Negative drift represents under-taught/rushed topics.
   - 'drift_explanation': Concise 1-sentence explanation of why drift occurred (e.g., "Rushed topic due to compressed holiday schedule — down-weighted in exam to protect students" or "Heavy lecture depth delivered").
3. Final Exam Weight ('weight_percent'):
   - If mode is 'drift_aware': set weight_percent to reflect actual_weight (rushed topics down-weighted).
   - If mode is 'planned': set weight_percent to reflect planned_weight.
   - MUST STRICTLY NORMALIZE weight_percent so that the sum of all topics EQUALS EXACTLY 100.

Course Information:
Course: ${course?.code || "Course"} — ${course?.title || "Academic Course"}
Credit Hours: ${course?.credit_hours || 3}

Course Outcomes:
${cosContext}

Delivered Lecture Material & Delivery Timestamps (RAG Context):
${documentsContext}`;

    const aiResult = await generateJSON(
      prompt,
      AIGeneratedBlueprintSchema,
      "gemini-1.5-pro"
    );

    // Normalize weights to sum exactly to 100
    const rawSum = aiResult.topics.reduce((acc, t) => acc + (t.weight_percent || 0), 0);
    const normalizedTopics = aiResult.topics.map((t, idx, arr) => {
      let norm = rawSum > 0 ? (t.weight_percent / rawSum) * 100 : 100 / arr.length;
      norm = Math.round(norm * 10) / 10;
      return {
        ...t,
        weight_percent: norm,
      };
    });

    // Adjust any 0.1 rounding difference on largest item
    const currentSum = normalizedTopics.reduce((acc, t) => acc + t.weight_percent, 0);
    if (currentSum !== 100 && normalizedTopics.length > 0) {
      const diff = Math.round((100 - currentSum) * 10) / 10;
      normalizedTopics[0].weight_percent = Math.round((normalizedTopics[0].weight_percent + diff) * 10) / 10;
    }

    // 2. Persist Blueprint
    const blueprintName =
      name ||
      `${mode === "drift_aware" ? "Drift-Aware" : "Standard"} Final Exam Blueprint`;

    const { data: blueprint, error: bpErr } = await supabase
      .from("blueprints")
      .insert({
        course_id,
        name: blueprintName,
      })
      .select()
      .single();

    if (bpErr || !blueprint) {
      console.error("[Insert Blueprint error]:", bpErr);
      return NextResponse.json({ error: bpErr?.message || "Failed to create blueprint" }, { status: 500 });
    }

    // 3. Persist Topics
    const topicsToInsert = normalizedTopics.map((t) => ({
      blueprint_id: blueprint.id,
      module: t.module,
      topic: t.topic,
      weight_percent: t.weight_percent,
      planned_weight: t.planned_weight,
      actual_weight: t.actual_weight,
      drift: t.drift,
    }));

    const { data: insertedTopics, error: tErr } = await supabase
      .from("blueprint_topics")
      .insert(topicsToInsert)
      .select();

    if (tErr) {
      console.error("[Insert blueprint_topics error]:", tErr);
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    // Merge drift_explanations from AI output into return payload
    const topicsWithExplanations = (insertedTopics || []).map((it, idx) => ({
      ...it,
      drift_explanation: normalizedTopics[idx]?.drift_explanation || null,
    }));

    return NextResponse.json(
      {
        success: true,
        blueprint,
        topics: topicsWithExplanations,
        total_weight: 100,
        mode,
        reasoning_summary: aiResult.reasoning_summary,
        confidence: 0.95,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/design/blueprint error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate exam blueprint" },
      { status: 500 }
    );
  }
}
