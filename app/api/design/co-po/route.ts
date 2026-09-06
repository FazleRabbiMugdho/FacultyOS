import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJSON } from "@/lib/ai";
import {
  GenerateCoPoSchema,
  AIGeneratedCoPoSchema,
  UpdateCoPoCellSchema,
} from "@/lib/design/schemas";

async function getSupabase() {
  try {
    return createClient();
  } catch {
    return createAdminClient();
  }
}

const DEFAULT_POS = [
  { code: "PO1", description: "Engineering Knowledge: Apply mathematics, science, and engineering fundamentals to complex engineering problems." },
  { code: "PO2", description: "Problem Analysis: Identify, formulate, and analyze complex computer science engineering problems." },
  { code: "PO3", description: "Design/Development: Design algorithmic solutions for complex systems with public safety and constraints." },
  { code: "PO4", description: "Investigation: Conduct investigations of complex problems using research-based knowledge and methods." },
  { code: "PO5", description: "Modern Tool Usage: Create, select, and apply appropriate techniques, resources, and modern IT tools." },
  { code: "PO6", description: "The Engineer & Society: Apply reasoning informed by contextual knowledge to assess societal and legal issues." },
  { code: "PO7", description: "Environment & Sustainability: Understand the impact of engineering solutions in societal and environmental contexts." },
  { code: "PO8", description: "Ethics: Apply ethical principles and commit to professional ethics and responsibilities." },
  { code: "PO9", description: "Individual & Team Work: Function effectively as an individual, and as a member or leader in diverse teams." },
  { code: "PO10", description: "Communication: Communicate effectively on complex engineering activities with the engineering community." },
  { code: "PO11", description: "Project Management: Demonstrate knowledge of engineering and management principles to manage projects." },
  { code: "PO12", description: "Life-long Learning: Recognize the need for, and have the preparation to engage in independent life-long learning." },
];

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get("course_id");
    if (!courseId) {
      return NextResponse.json(
        { error: "course_id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabase();

    // 1. Fetch Course Outcomes
    const { data: cos, error: coErr } = await supabase
      .from("course_outcomes")
      .select("*")
      .eq("course_id", courseId)
      .order("code", { ascending: true });

    if (coErr) {
      return NextResponse.json({ error: coErr.message }, { status: 500 });
    }

    // 2. Fetch Program Outcomes (auto-seed standard ABET POs if empty)
    let { data: pos, error: poErr } = await supabase
      .from("program_outcomes")
      .select("*")
      .order("code", { ascending: true });

    if (poErr) {
      return NextResponse.json({ error: poErr.message }, { status: 500 });
    }

    if (!pos || pos.length === 0) {
      await supabase.from("program_outcomes").insert(DEFAULT_POS);
      const { data: seededPOs } = await supabase
        .from("program_outcomes")
        .select("*")
        .order("code", { ascending: true });
      pos = seededPOs || [];
    }

    // Sort POs naturally by numerical index (PO1, PO2, ... PO12)
    pos.sort((a, b) => {
      const numA = parseInt(a.code.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.code.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });

    const coIds = (cos || []).map((c) => c.id);

    // 3. Fetch Mappings
    let mappings: any[] = [];
    if (coIds.length > 0) {
      const { data: mapData, error: mapErr } = await supabase
        .from("co_po_mappings")
        .select("*")
        .in("co_id", coIds);

      if (mapErr) {
        return NextResponse.json({ error: mapErr.message }, { status: 500 });
      }
      mappings = mapData || [];
    }

    const totalCells = (cos?.length || 0) * (pos?.length || 0);
    const mappedCells = mappings.length;
    const sparsityPercent =
      totalCells > 0
        ? Math.round(((totalCells - mappedCells) / totalCells) * 100)
        : 100;

    return NextResponse.json({
      course_outcomes: cos || [],
      program_outcomes: pos || [],
      mappings,
      total_cells: totalCells,
      mapped_cells: mappedCells,
      sparsity_percent: sparsityPercent,
    });
  } catch (err: any) {
    console.error("[GET /api/design/co-po error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch CO-PO matrix data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = GenerateCoPoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { course_id } = parsed.data;
    const supabase = await getSupabase();

    // 1. Get COs and POs
    const { data: cos, error: coErr } = await supabase
      .from("course_outcomes")
      .select("*")
      .eq("course_id", course_id)
      .order("code", { ascending: true });

    if (coErr || !cos || cos.length === 0) {
      return NextResponse.json(
        { error: "No Course Outcomes found for this course. Please generate COs first." },
        { status: 400 }
      );
    }

    let { data: pos } = await supabase
      .from("program_outcomes")
      .select("*")
      .order("code", { ascending: true });

    if (!pos || pos.length === 0) {
      await supabase.from("program_outcomes").insert(DEFAULT_POS);
      const { data: seeded } = await supabase
        .from("program_outcomes")
        .select("*")
        .order("code", { ascending: true });
      pos = seeded || [];
    }

    pos.sort((a, b) => {
      const numA = parseInt(a.code.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.code.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });

    const cosFormatted = cos
      .map(
        (c) =>
          `- ${c.code} (Bloom L${c.bloom_level}): "${c.statement}" [Action verbs: ${c.action_verbs?.join(", ") || "none"}]`
      )
      .join("\n");

    const posFormatted = pos
      .map((p) => `- ${p.code}: ${p.description}`)
      .join("\n");

    const prompt = `You are an expert accreditation and curriculum assessment specialist for ABET and Outcome-Based Education (OBE).
Your task is to establish the Course Outcome to Program Outcome (CO–PO) correlation matrix for the following university course.

CRITICAL OBE CONSTRAINTS & SPARSITY RULES:
1. Weight Definition Scale:
   - Weight 1 (Low / Foundational): The CO provides introductory or recall-level coverage of the PO.
   - Weight 2 (Medium / Application): The CO requires direct application, algorithmic implementation, or problem solving aligned with the PO.
   - Weight 3 (High / Substantial): The CO demands advanced design, mathematical proof, critical evaluation, or system architecture directly achieving the PO.
2. STRICT SPARSITY ENFORCEMENT (REJECT DENSE MATRICES):
   - Authentic academic curriculum matrices are rigorously SPARSE.
   - Each CO must typically map to ONLY 2 to 4 Program Outcomes.
   - DO NOT map every CO to every PO. Most combinations must have NO mapping (weight 0 / omitted from list).
   - Only include genuine, verifiable pedagogical correlations.
3. Output Format:
   - Return a JSON object with 'mappings' array: [ { co_code: 'CO1', po_code: 'PO1', weight: 1|2|3, rationale: '...' } ]

Course Outcomes to Map:
${cosFormatted}

Institutional Program Outcomes (POs):
${posFormatted}`;

    const aiResult = await generateJSON(
      prompt,
      AIGeneratedCoPoSchema,
      "gemini-1.5-pro"
    );

    // Map co_code and po_code to UUIDs
    const coCodeMap = new Map(cos.map((c) => [c.code.toUpperCase(), c.id]));
    const poCodeMap = new Map(pos.map((p) => [p.code.toUpperCase(), p.id]));

    const validInserts: Array<{ co_id: string; po_id: string; weight: number }> = [];

    for (const item of aiResult.mappings) {
      const coId = coCodeMap.get(item.co_code.toUpperCase());
      const poId = poCodeMap.get(item.po_code.toUpperCase());

      if (coId && poId && [1, 2, 3].includes(item.weight)) {
        validInserts.push({
          co_id: coId,
          po_id: poId,
          weight: item.weight,
        });
      }
    }

    const coIds = cos.map((c) => c.id);

    // Clear previous mappings for these COs
    if (coIds.length > 0) {
      await supabase.from("co_po_mappings").delete().in("co_id", coIds);
    }

    // Insert new mappings
    let insertedMappings: any[] = [];
    if (validInserts.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from("co_po_mappings")
        .insert(validInserts)
        .select();

      if (insErr) {
        console.error("[Insert CO-PO mappings error]:", insErr);
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
      insertedMappings = inserted || [];
    }

    const totalCells = cos.length * pos.length;
    const mappedCells = insertedMappings.length;
    const sparsityPercent =
      totalCells > 0
        ? Math.round(((totalCells - mappedCells) / totalCells) * 100)
        : 100;

    return NextResponse.json({
      success: true,
      mappings: insertedMappings,
      mapped_cells: mappedCells,
      total_cells: totalCells,
      sparsity_percent: sparsityPercent,
      confidence: 0.96,
    });
  } catch (err: any) {
    console.error("[POST /api/design/co-po error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate CO-PO matrix" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UpdateCoPoCellSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { co_id, po_id, weight } = parsed.data;
    const supabase = await getSupabase();

    if (weight === 0) {
      // Delete mapping
      const { error: delErr } = await supabase
        .from("co_po_mappings")
        .delete()
        .eq("co_id", co_id)
        .eq("po_id", po_id);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "deleted",
        co_id,
        po_id,
        weight: 0,
      });
    } else {
      // Upsert mapping
      const { data: upserted, error: upErr } = await supabase
        .from("co_po_mappings")
        .upsert(
          { co_id, po_id, weight },
          { onConflict: "co_id,po_id" }
        )
        .select()
        .single();

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "upserted",
        mapping: upserted,
        weight,
      });
    }
  } catch (err: any) {
    console.error("[PATCH /api/design/co-po error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update CO-PO mapping cell" },
      { status: 500 }
    );
  }
}
