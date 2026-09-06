import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/gemini";
import { embedBatch } from "@/lib/ai/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GenerateQuestionsRequestSchema,
  GeminiQuestionsOutputSchema,
  GeminiQuestionsOutput,
  GenerateQuestionsResponse,
  QuestionItem,
} from "@/lib/questions/types";
import { MOCK_COURSES } from "@/lib/questions/mock-blueprint";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validatedRequest = GenerateQuestionsRequestSchema.parse(rawBody);

    const {
      course_id,
      blueprint_id,
      total_marks,
      target_lower_order_percent,
      target_higher_order_percent,
      exam_title,
      custom_instructions,
    } = validatedRequest;

    // 1. Fetch Course, Course Outcomes, and Blueprint Topics (Supabase with mock fallback)
    let courseTitle = "Data Structures & Algorithm Design";
    let courseCode = "CS301";
    let courseOutcomes: Array<{ id?: string; code: string; statement: string; bloom_level: number }> = [];
    let blueprintTopics: Array<{ module: string; topic: string; weight_percent: number }> = [];

    const mockCourse = MOCK_COURSES.find((c) => c.id === course_id) || MOCK_COURSES[0];

    try {
      const supabase = createAdminClient();

      // Fetch course
      const { data: dbCourse } = await supabase
        .from("courses")
        .select("id, code, title")
        .eq("id", course_id)
        .single();

      if (dbCourse) {
        courseTitle = dbCourse.title;
        courseCode = dbCourse.code;
      }

      // Fetch outcomes
      const { data: dbOutcomes } = await supabase
        .from("course_outcomes")
        .select("id, code, statement, bloom_level")
        .eq("course_id", course_id);

      if (dbOutcomes && dbOutcomes.length > 0) {
        courseOutcomes = dbOutcomes;
      }

      // Fetch blueprint topics
      if (blueprint_id) {
        const { data: dbTopics } = await supabase
          .from("blueprint_topics")
          .select("module, topic, weight_percent")
          .eq("blueprint_id", blueprint_id);

        if (dbTopics && dbTopics.length > 0) {
          blueprintTopics = dbTopics.map((t) => ({
            module: t.module,
            topic: t.topic,
            weight_percent: Number(t.weight_percent),
          }));
        }
      }
    } catch (dbErr) {
      console.warn("[Track B API] Supabase query fallback to mock seed:", dbErr);
    }

    // Fallback to mock data if empty
    if (courseOutcomes.length === 0) {
      courseOutcomes = mockCourse.outcomes;
    }
    if (blueprintTopics.length === 0) {
      blueprintTopics = mockCourse.blueprints[0].topics.map((t) => ({
        module: t.module,
        topic: t.topic,
        weight_percent: t.weight_percent,
      }));
    }

    // 2. Build Constrained Prompt for Gemini
    const topicsFormatted = blueprintTopics
      .map((t) => `- ${t.module}: ${t.topic} (Weight: ${t.weight_percent}%)`)
      .join("\n");

    const outcomesFormatted = courseOutcomes
      .map((co) => `- [${co.code}] Bloom Level ${co.bloom_level}: ${co.statement}`)
      .join("\n");

    const systemPrompt = `
You are an expert University Examination Board Author and OBE Specialist.
Generate a rigorous, blueprint-constrained question paper for:
Course: ${courseCode} - ${courseTitle}
Exam Title: ${exam_title}
Total Marks: ${total_marks} Marks

### Blueprint Mark Distribution:
${topicsFormatted}

### Available Course Outcomes (COs):
${outcomesFormatted}

### Constraints & Target Ratios:
1. TARGET COGNITIVE BALANCE:
   - Lower-Order Thinking (Bloom Level 1 Remember, Level 2 Understand): ${target_lower_order_percent}% of total marks.
   - Higher-Order Thinking (Bloom Level 3 Apply, Level 4 Analyze, Level 5 Evaluate, Level 6 Create): ${target_higher_order_percent}% of total marks.
2. TOTAL MARKS ALLOCATION:
   - Sum of marks across all generated questions MUST EXACTLY equal ${total_marks} marks.
   - Distribute questions across modules proportional to their blueprint weight_percent.
3. GRANULAR QUESTIONS:
   - Create multi-part or individual questions (e.g. 5 to 12 marks each).
4. ⭐ CRITICAL DIFFERENTIATOR — SKILL SIGNATURE:
   - For every question, generate a normalized 'skill_signature'. This is a concise, context-agnostic sentence specifying the exact cognitive/technical skill tested (e.g., "calculate shortest path using Dijkstra on directed weighted graph", "derive tight asymptotic bound using Master Theorem").
   - Provide 3-5 'skill_tags' (e.g. ["graph", "dijkstra", "shortest-path", "algorithm-execution"]).
   - Provide 'estimated_minutes' for a prepared student (approx 1.5 min per mark for recall, 2.5 min per mark for analysis/synthesis).
${custom_instructions ? `\n### Additional Faculty Instructions:\n${custom_instructions}` : ""}

Return pure valid JSON with array of questions following the schema.
`;

    // 3. Generate Questions with Gemini 1.5 Pro
    let generatedData: { questions: QuestionItem[]; paper_rationale?: string };
    try {
      generatedData = (await generateJSON(systemPrompt, GeminiQuestionsOutputSchema, "gemini-1.5-pro")) as any;
    } catch (aiErr) {
      try {
        generatedData = (await generateJSON(systemPrompt, GeminiQuestionsOutputSchema, "gemini-1.5-flash")) as any;
      } catch (fallbackErr) {
        console.warn("[Gemini API offline/key missing, using deterministic blueprint generator]:", fallbackErr);
        
        const q1Marks = Math.max(5, Math.round(total_marks * 0.20));
        const q2Marks = Math.max(4, Math.round(total_marks * 0.15));
        const q3Marks = Math.max(6, Math.round(total_marks * 0.25));
        const q4Marks = Math.max(8, Math.round(total_marks * 0.25));
        const q5Marks = Math.max(4, total_marks - (q1Marks + q2Marks + q3Marks + q4Marks));

        const mockQuestions: QuestionItem[] = [
          {
            module: blueprintTopics[0]?.module || "Module 1: Asymptotic Analysis",
            topic: blueprintTopics[0]?.topic || "Recurrence Relations",
            text: "Solve the recurrence relation T(n) = 3T(n/2) + O(n log n) using the Master Theorem. State all three Master Theorem cases and justify which case applies.",
            marks: q1Marks,
            bloom_level: 4,
            co_code: courseOutcomes[0]?.code || "CO1",
            skill_signature: "solve divide-and-conquer recurrence relations using Master Theorem analysis",
            skill_tags: ["recurrence relations", "Master theorem", "asymptotic analysis", "divide-and-conquer"],
            estimated_minutes: 15,
            source: "generated",
          },
          {
            module: blueprintTopics[0]?.module || "Module 1: Asymptotic Analysis",
            topic: "Big-O Formal Definitions",
            text: "Formally define Big-O, Big-Omega, and Big-Theta asymptotic bounds using limits and constant multipliers (c, n0). Provide a graphical sketch illustrating each bound.",
            marks: q2Marks,
            bloom_level: 2,
            co_code: courseOutcomes[4]?.code || "CO5",
            skill_signature: "state and sketch formal definitions of asymptotic upper, lower, and tight bounds",
            skill_tags: ["asymptotic bounds", "Big-O", "formal definition", "graphical bounds"],
            estimated_minutes: 10,
            source: "generated",
          },
          {
            module: blueprintTopics[1]?.module || "Module 2: Advanced Data Structures",
            topic: blueprintTopics[1]?.topic || "AVL Trees & Self-Balancing",
            text: "Demonstrate step-by-step the insertion of the following sequence of keys into an initially empty AVL Tree: [15, 20, 24, 10, 13, 11]. Identify every Left-Right (LR) and Right-Right (RR) rotation performed and state the balance factors.",
            marks: q3Marks,
            bloom_level: 3,
            co_code: courseOutcomes[1]?.code || "CO2",
            skill_signature: "execute AVL tree insertions with single and double rotations maintaining balance factor invariants",
            skill_tags: ["AVL tree", "binary search tree", "tree rotation", "balance factor"],
            estimated_minutes: 20,
            source: "generated",
          },
          {
            module: blueprintTopics[2]?.module || "Module 3: Graph Algorithms",
            topic: blueprintTopics[2]?.topic || "Dijkstra Shortest Path",
            text: "Apply Dijkstra's algorithm to compute the shortest paths from source vertex S in the given weighted directed graph. Construct the distance table after each vertex extraction and prove why Dijkstra fails on negative edge cycles.",
            marks: q4Marks,
            bloom_level: 3,
            co_code: courseOutcomes[2]?.code || "CO3",
            skill_signature: "apply Dijkstra algorithm single-source shortest path with priority queue relaxation",
            skill_tags: ["Dijkstra algorithm", "shortest path", "greedy algorithm", "graph relaxation"],
            estimated_minutes: 25,
            source: "generated",
          },
          {
            module: blueprintTopics[2]?.module || "Module 3: Graph Algorithms",
            topic: "Minimum Spanning Trees",
            text: "Design an optimized network topology using Kruskal's Minimum Spanning Tree algorithm. Prove the Cut Property of MSTs and analyze the time complexity using Disjoint Set Union-Find with path compression.",
            marks: q5Marks,
            bloom_level: 6,
            co_code: courseOutcomes[2]?.code || "CO3",
            skill_signature: "synthesize optimal Minimum Spanning Tree using Kruskal algorithm with Disjoint-Set Union-Find proof",
            skill_tags: ["Kruskal algorithm", "Minimum Spanning Tree", "Disjoint Set", "Cut Property"],
            estimated_minutes: 20,
            source: "generated",
          },
        ];

        generatedData = {
          questions: mockQuestions,
          paper_rationale: "Pedagogically balanced examination assessing asymptotic fundamentals, balanced search structures, and greedy graph optimization.",
        };
      }
    }

    const rawQuestions: QuestionItem[] = generatedData.questions;

    // Normalize marks if slight rounding variance occurred
    const currentSum = rawQuestions.reduce((acc: number, q: QuestionItem) => acc + q.marks, 0);
    if (currentSum !== total_marks && rawQuestions.length > 0) {
      const diff = total_marks - currentSum;
      rawQuestions[rawQuestions.length - 1].marks += diff;
    }

    // 4. Generate 768-dim Vector Embeddings
    const questionTexts = rawQuestions.map((q: QuestionItem) => `${q.text} \nSkill: ${q.skill_signature}`);
    let embeddings: number[][] = [];
    try {
      embeddings = await embedBatch(questionTexts);
    } catch (embedErr) {
      console.warn("[Embeddings batch warning]:", embedErr);
    }

    // 5. Persist to Supabase questions table
    const questionsWithIds: QuestionItem[] = [];

    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const matchedCO = courseOutcomes.find((co) => co.code === q.co_code) || courseOutcomes[0];
      const embedding = embeddings[i] || null;

      let generatedId = `q_${Date.now()}_${i}`;

      try {
        const supabase = createAdminClient();
        const { data: insertedQuestion, error: insertErr } = await supabase
          .from("questions")
          .insert({
            course_id: course_id.startsWith("course-") ? null : course_id,
            blueprint_id: blueprint_id && !blueprint_id.startsWith("bp-") ? blueprint_id : null,
            text: q.text,
            marks: q.marks,
            bloom_level: q.bloom_level,
            co_id: matchedCO.id && !matchedCO.id.startsWith("co-") ? matchedCO.id : null,
            source: "generated",
            embedding: embedding,
            skill_signature: q.skill_signature,
            skill_tags: q.skill_tags,
          })
          .select("id")
          .single();

        if (insertedQuestion?.id) {
          generatedId = insertedQuestion.id;
        } else if (insertErr) {
          console.warn("[Supabase insert question warning]:", insertErr.message);
        }
      } catch (dbErr) {
        // In local/mock mode, continue with generatedId
      }

      questionsWithIds.push({
        ...q,
        id: generatedId,
        co_id: matchedCO.id || `co-${q.co_code}`,
        source: "generated",
      });
    }

    // 6. Compute Cognitive Balance & Distribution Statistics
    let lowerOrderMarks = 0;
    let higherOrderMarks = 0;
    let totalMinutes = 0;
    const moduleMarksMap: Record<string, { marks: number; count: number }> = {};
    const bloomDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    for (const q of questionsWithIds) {
      if (q.bloom_level <= 2) {
        lowerOrderMarks += q.marks;
      } else {
        higherOrderMarks += q.marks;
      }

      bloomDist[q.bloom_level] = (bloomDist[q.bloom_level] || 0) + q.marks;
      totalMinutes += q.estimated_minutes || q.marks * 2;

      if (!moduleMarksMap[q.module]) {
        moduleMarksMap[q.module] = { marks: 0, count: 0 };
      }
      moduleMarksMap[q.module].marks += q.marks;
      moduleMarksMap[q.module].count += 1;
    }

    const actualLowerRatio = Math.round((lowerOrderMarks / total_marks) * 100);
    const actualHigherRatio = Math.round((higherOrderMarks / total_marks) * 100);

    const moduleBreakdown = Object.entries(moduleMarksMap).map(([mod, data]) => ({
      module: mod,
      marks: data.marks,
      weight_percent: Math.round((data.marks / total_marks) * 100),
      question_count: data.count,
    }));

    const responsePayload: GenerateQuestionsResponse = {
      success: true,
      questions: questionsWithIds,
      stats: {
        total_marks,
        total_questions: questionsWithIds.length,
        target_lower_ratio: target_lower_order_percent,
        target_higher_ratio: target_higher_order_percent,
        actual_lower_ratio: actualLowerRatio,
        actual_higher_ratio: actualHigherRatio,
        estimated_total_minutes: totalMinutes,
        module_breakdown: moduleBreakdown,
        bloom_distribution: bloomDist,
      },
      paper_rationale: generatedData.paper_rationale,
      course_id,
      blueprint_id,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("[POST /api/questions/generate error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to generate question paper",
      },
      { status: 400 }
    );
  }
}
