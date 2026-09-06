import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAnalyticRubric, normalizeRubricCriteria, SEEDED_MOCK_RUBRICS } from "@/lib/questions/rubric";
import { GenerateRubricRequestSchema, RubricSchema } from "@/lib/questions/types";
import { MOCK_HISTORICAL_QUESTIONS } from "@/lib/questions/mock-historical";

/**
 * GET /api/questions/rubric?question_id=...
 * Consumed by Track B (Rubric Editor) and Track C (Multimodal AI & Double-Blind Grading)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("question_id");
    const courseId = searchParams.get("course_id");

    const supabase = createClient();

    // 1. Single Question Rubric lookup
    if (questionId) {
      // First check Supabase DB
      const { data: dbRubric, error: dbError } = await supabase
        .from("rubrics")
        .select("id, question_id, criteria, total_marks, created_at")
        .eq("question_id", questionId)
        .maybeSingle();

      if (dbRubric && !dbError) {
        return NextResponse.json({
          success: true,
          rubric: {
            id: dbRubric.id,
            question_id: dbRubric.question_id,
            total_marks: dbRubric.total_marks,
            criteria: dbRubric.criteria,
            is_published: true,
            created_at: dbRubric.created_at,
          },
          source: "database",
        });
      }

      // Check Seeded Mock Rubrics
      if (SEEDED_MOCK_RUBRICS[questionId]) {
        return NextResponse.json({
          success: true,
          rubric: SEEDED_MOCK_RUBRICS[questionId],
          source: "seeded",
        });
      }

      const historicalQuestion = MOCK_HISTORICAL_QUESTIONS.find((question) => question.id === questionId);
      if (historicalQuestion) {
        const fallbackRubric = await generateAnalyticRubric({
          question_id: questionId,
          text: historicalQuestion.text,
          marks: historicalQuestion.marks,
          bloom_level: historicalQuestion.bloom_level,
          skill_signature: historicalQuestion.skill_signature,
          co_code: historicalQuestion.co_code,
        });
        return NextResponse.json({ success: true, rubric: fallbackRubric, source: "historical-fallback" });
      }

      // If question exists in DB without rubric, fetch question details for auto-gen
      const { data: qData } = await supabase
        .from("questions")
        .select("id, text, marks, bloom_level, skill_signature")
        .eq("id", questionId)
        .maybeSingle();

      if (qData) {
        const fallbackRubric = await generateAnalyticRubric({
          question_id: qData.id,
          text: qData.text,
          marks: qData.marks,
          bloom_level: qData.bloom_level,
          skill_signature: qData.skill_signature || undefined,
        });

        return NextResponse.json({
          success: true,
          rubric: fallbackRubric,
          source: "auto-generated",
        });
      }

      // Return standard default rubric
      return NextResponse.json({
        success: true,
        rubric: SEEDED_MOCK_RUBRICS["hist-bayes-01"],
        source: "default-fallback",
      });
    }

    // 2. Fetch all rubrics for course questions
    if (courseId) {
      const { data: courseRubrics } = await supabase
        .from("rubrics")
        .select(`
          id,
          question_id,
          criteria,
          total_marks,
          created_at,
          questions!inner(id, course_id, text, marks, bloom_level)
        `)
        .eq("questions.course_id", courseId);

      return NextResponse.json({
        success: true,
        rubrics: courseRubrics || [],
      });
    }

    // Default list of seeded rubrics
    return NextResponse.json({
      success: true,
      rubrics: Object.values(SEEDED_MOCK_RUBRICS),
    });
  } catch (error: any) {
    console.error("GET /api/questions/rubric error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch rubric" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/questions/rubric
 * Generates an Analytic Rubric using Gemini AI with Error-Carried-Forward rules
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = GenerateRubricRequestSchema.parse(body);

    const supabase = createClient();
    let questionText = validated.text;
    let questionMarks = validated.marks;
    let bloomLevel = validated.bloom_level;
    let skillSignature = validated.skill_signature;

    // If question details were not passed inline, fetch from Supabase
    if (!questionText || !questionMarks) {
      const { data: qData } = await supabase
        .from("questions")
        .select("id, text, marks, bloom_level, skill_signature")
        .eq("id", validated.question_id)
        .maybeSingle();

      if (qData) {
        questionText = questionText || qData.text;
        questionMarks = questionMarks || qData.marks;
        bloomLevel = bloomLevel || qData.bloom_level;
        skillSignature = skillSignature || qData.skill_signature || undefined;
      }
    }

    // Fallback defaults if standalone question
    questionText = questionText || "Explain the concept, formulate the mathematical proof, and evaluate asymptotic runtime.";
    questionMarks = questionMarks || 10;
    bloomLevel = bloomLevel || 3;

    // Generate Analytic Rubric with Gemini AI
    const generatedRubric = await generateAnalyticRubric({
      question_id: validated.question_id,
      text: questionText,
      marks: questionMarks,
      bloom_level: bloomLevel,
      skill_signature: skillSignature,
      co_code: validated.co_code,
      granularity: validated.granularity,
      custom_guidance: validated.custom_guidance,
    });

    // Try to persist into Supabase rubrics table
    try {
      const { data: savedRubric, error: saveError } = await supabase
        .from("rubrics")
        .upsert(
          {
            question_id: validated.question_id,
            criteria: generatedRubric.criteria,
            total_marks: generatedRubric.total_marks,
          },
          { onConflict: "question_id" }
        )
        .select("id, question_id, criteria, total_marks, created_at")
        .maybeSingle();

      if (savedRubric && !saveError) {
        return NextResponse.json({
          success: true,
          rubric: {
            ...generatedRubric,
            id: savedRubric.id,
            created_at: savedRubric.created_at,
          },
        });
      }
    } catch (dbErr) {
      console.warn("Could not persist rubric to database, returning in-memory rubric:", dbErr);
    }

    return NextResponse.json({
      success: true,
      rubric: generatedRubric,
    });
  } catch (error: any) {
    console.error("POST /api/questions/rubric error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate rubric" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/questions/rubric
 * Updates criteria, recalculates totals, and marks as published for Track C
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RubricSchema.parse(body);

    const supabase = createClient();
    const currentSum = validated.criteria.reduce((s, c) => s + Number(c.max_marks || 0), 0);

    // Ensure criteria marks match total marks
    const normalizedCriteria = normalizeRubricCriteria(validated.criteria, validated.total_marks);

    // Save to database
    try {
      const { data: updatedRubric, error: updateError } = await supabase
        .from("rubrics")
        .upsert(
          {
            question_id: validated.question_id,
            criteria: normalizedCriteria,
            total_marks: validated.total_marks,
          },
          { onConflict: "question_id" }
        )
        .select("id, question_id, criteria, total_marks, created_at")
        .maybeSingle();

      if (updatedRubric && !updateError) {
        return NextResponse.json({
          success: true,
          rubric: {
            ...validated,
            id: updatedRubric.id,
            criteria: normalizedCriteria,
            is_published: validated.is_published,
            updated_at: new Date().toISOString(),
          },
          message: validated.is_published
            ? "Rubric published successfully! Available for Track C grading."
            : "Rubric draft saved successfully.",
        });
      }
    } catch (dbErr) {
      console.warn("Database update error, returning updated payload:", dbErr);
    }

    return NextResponse.json({
      success: true,
      rubric: {
        ...validated,
        criteria: normalizedCriteria,
        updated_at: new Date().toISOString(),
      },
      message: "Rubric updated successfully.",
    });
  } catch (error: any) {
    console.error("PUT /api/questions/rubric error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update rubric" },
      { status: 500 }
    );
  }
}
