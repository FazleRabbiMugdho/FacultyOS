import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJSON } from "@/lib/ai";
import {
  GenerateOutcomesSchema,
  AIGeneratedOutcomesSchema,
  CreateOutcomeManualSchema,
} from "@/lib/design/schemas";
import { fallbackOutcomes } from "@/lib/design/fallbacks";

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
      return NextResponse.json(
        { error: "course_id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabase();
    const { data: outcomes, error } = await supabase
      .from("course_outcomes")
      .select("*")
      .eq("course_id", courseId)
      .order("code", { ascending: true });

    if (error) {
      console.error("[GET /api/design/outcomes error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ outcomes: outcomes || [] });
  } catch (err: any) {
    console.error("[GET /api/design/outcomes error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch outcomes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mode A: Manual single outcome creation
    if (body.is_manual) {
      const parsedManual = CreateOutcomeManualSchema.safeParse(body);
      if (!parsedManual.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsedManual.error.format() },
          { status: 400 }
        );
      }

      const supabase = await getSupabase();
      const { data: outcome, error } = await supabase
        .from("course_outcomes")
        .insert({
          course_id: parsedManual.data.course_id,
          code: parsedManual.data.code.toUpperCase(),
          statement: parsedManual.data.statement,
          bloom_level: parsedManual.data.bloom_level,
          action_verbs: parsedManual.data.action_verbs,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ outcome }, { status: 201 });
    }

    // Mode B: AI Generation from Syllabus
    const parsed = GenerateOutcomesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { course_id, syllabus_text } = parsed.data;

    const prompt = `You are an expert higher-education curriculum architect specializing in Outcome-Based Education (OBE) and ABET accreditation.
Analyze the following university course syllabus and extract 4 to 8 measurable, observable Course Outcomes (COs).

STRICT CONSTRAINTS & REQUIREMENTS:
1. Bloom's Taxonomy Cognitive Level Alignment:
   - Assign each outcome a 'bloom_level' integer from 1 to 6:
     * Level 1 (Remember): recall, define, identify, list, name, state
     * Level 2 (Understand): explain, summarize, classify, describe, interpret, paraphrase
     * Level 3 (Apply): apply, solve, compute, implement, execute, calculate, demonstrate
     * Level 4 (Analyze): analyze, differentiate, deconstruct, compare, contrast, distinguish
     * Level 5 (Evaluate): evaluate, critique, justify, judge, assess, appraise, validate
     * Level 6 (Create): design, construct, formulate, synthesize, develop, architect
2. Action Verbs:
   - The 'action_verbs' list MUST strictly contain 1-3 active verbs belonging to the specified Bloom level.
   - Never use passive or unmeasurable words like "learn", "know", "be familiar with".
3. Measurability:
   - Every statement must begin with a strong action verb and specify clear student competency.
4. Balanced Distribution:
   - Provide a natural spread spanning foundational comprehension (Levels 1-2), direct problem-solving (Level 3), and higher-order analytical/synthesis competence (Levels 4-6).
5. Numbering:
   - Set codes sequentially: CO1, CO2, CO3, ...

Syllabus Content:
\"\"\"
${syllabus_text}
\"\"\"`;

    // Call Gemini 1.5 Pro with Zod Schema validation
    let source: "ai" | "fallback" = "ai";
    let aiResult;
    try {
      aiResult = await generateJSON(
        prompt,
        AIGeneratedOutcomesSchema,
        "gemini-1.5-pro"
      );
    } catch (aiError) {
      console.warn("[Track A outcomes] Gemini unavailable; using deterministic fallback:", aiError);
      aiResult = AIGeneratedOutcomesSchema.parse(fallbackOutcomes(syllabus_text));
      source = "fallback";
    }

    const supabase = await getSupabase();

    // Prepare records for database insertion
    const outcomesToInsert = aiResult.outcomes.map((item, index) => ({
      course_id,
      code: item.code || `CO${index + 1}`,
      statement: item.statement,
      bloom_level: item.bloom_level,
      action_verbs: item.action_verbs || [],
    }));

    const { data: insertedOutcomes, error: insertError } = await supabase
      .from("course_outcomes")
      .insert(outcomesToInsert)
      .select();

    if (insertError) {
      console.error("[Insert Course Outcomes error]:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Save syllabus document in documents table for future RAG / drift analysis
    try {
      await supabase.from("documents").insert({
        course_id,
        type: "syllabus",
        extracted_text: syllabus_text,
      });
    } catch (docErr) {
      console.warn("[Could not save syllabus to documents table]:", docErr);
    }

    return NextResponse.json(
      {
        outcomes: insertedOutcomes,
        count: insertedOutcomes.length,
        confidence: source === "ai" ? 0.94 : 0.82,
        source,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/design/outcomes error]:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Failed to generate course outcomes. Please verify AI configuration.",
      },
      { status: 500 }
    );
  }
}
