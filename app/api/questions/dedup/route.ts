import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuestionItem } from "@/lib/questions/types";
import { MOCK_HISTORICAL_QUESTIONS, HistoricalQuestion } from "@/lib/questions/mock-historical";
import { auditQuestion, DedupFlagResult } from "@/lib/questions/dedup";
import { z } from "zod";

const DedupRequestSchema = z.object({
  course_id: z.string().optional(),
  blueprint_id: z.string().optional(),
  questions: z.array(z.any()).optional(),
  generated_questions: z.array(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const { course_id, blueprint_id, questions, generated_questions } = DedupRequestSchema.parse(rawBody);

    let historicalList: HistoricalQuestion[] = [...MOCK_HISTORICAL_QUESTIONS];
    let candidateQuestions: QuestionItem[] = questions || generated_questions || [];

    // 1. Fetch from Supabase if questions weren't passed in body
    try {
      const supabase = createAdminClient();

      // Fetch historical questions
      const { data: dbHistorical } = await supabase
        .from("questions")
        .select("id, text, marks, bloom_level, source, skill_signature, skill_tags, course_id")
        .eq("source", "historical");

      if (dbHistorical && dbHistorical.length > 0) {
        historicalList = dbHistorical.map((h) => ({
          id: h.id,
          text: h.text,
          marks: h.marks,
          bloom_level: h.bloom_level,
          co_code: "CO-HIST",
          module: "Historical",
          topic: "Past Paper",
          skill_signature: h.skill_signature || "standard algorithmic problem",
          skill_tags: h.skill_tags || [],
          source: "historical",
          exam_year: "Past Exam",
          semester: "Previous Term",
          course_code: "CS301",
        }));
      }

      // If candidates list is empty, fetch latest generated questions from DB
      if (candidateQuestions.length === 0 && course_id) {
        const { data: dbGenerated } = await supabase
          .from("questions")
          .select("id, text, marks, bloom_level, source, skill_signature, skill_tags, course_id")
          .eq("source", "generated")
          .order("created_at", { ascending: false })
          .limit(10);

        if (dbGenerated && dbGenerated.length > 0) {
          candidateQuestions = dbGenerated.map((g) => ({
            id: g.id,
            text: g.text,
            marks: g.marks,
            bloom_level: g.bloom_level,
            co_code: "CO1",
            module: "Module",
            topic: "Exam Topic",
            skill_signature: g.skill_signature || "",
            skill_tags: g.skill_tags || [],
            source: "generated",
          }));
        }
      }
    } catch (dbErr) {
      console.warn("[Dedup API] Supabase query fallback to mock historical seed:", dbErr);
    }

    // Fallback candidates if still empty
    if (candidateQuestions.length === 0) {
      candidateQuestions = [
        {
          id: "demo-q1",
          module: "Module 3: Graph Algorithms",
          topic: "Dijkstra Shortest Path",
          text: "Given a weighted graph with vertices {A, B, C, D, E}, compute the single-source shortest path tree from source 'A' using Dijkstra's algorithm. Show distance updates.",
          marks: 10,
          bloom_level: 3,
          co_code: "CO3",
          skill_signature: "execute Dijkstra algorithm single-source shortest path step-by-step",
          skill_tags: ["graphs", "dijkstra", "shortest-path", "execution"],
          source: "generated",
        },
        {
          id: "demo-q2",
          module: "Module 2: Probabilistic Reasoning",
          topic: "Bayesian Inference",
          text: "An automated email spam classifier has a 99% true positive rate on spam emails, with a 2% false alarm rate on legitimate emails. If 1% of all received emails are spam, compute the probability that an email flagged as spam is actually spam.",
          marks: 8,
          bloom_level: 3,
          co_code: "CO2",
          skill_signature: "apply Bayes' theorem to calculate 2-variable posterior given sensitivity and base-rate prevalence",
          skill_tags: ["probability", "bayes-rule", "posterior-probability", "sensitivity-specificity"],
          source: "generated",
        },
        {
          id: "demo-q3",
          module: "Module 1: Asymptotic Analysis",
          topic: "Recurrences",
          text: "Design a divide-and-conquer algorithm to find the majority element in an unsorted array of size n in O(n log n) time. Formulate its recurrence relation.",
          marks: 10,
          bloom_level: 6,
          co_code: "CO1",
          skill_signature: "design divide-and-conquer algorithm for majority element with recurrence",
          skill_tags: ["divide-and-conquer", "algorithm-design", "recurrence"],
          source: "generated",
        },
      ];
    }

    // 2. Run Triple-Layer Audit for each candidate
    const auditResults: DedupFlagResult[] = candidateQuestions.map((q) =>
      auditQuestion(q, historicalList)
    );

    // 3. Persist flags to Supabase question_dedup_flags table
    try {
      const supabase = createAdminClient();
      for (const flag of auditResults) {
        if (flag.matched_question_id && flag.question_id && !flag.question_id.startsWith("demo-")) {
          await supabase.from("question_dedup_flags").upsert({
            question_id: flag.question_id,
            matched_question_id: flag.matched_question_id.startsWith("hist-") ? null : flag.matched_question_id,
            cosine: flag.cosine,
            jaccard: flag.jaccard,
            status: flag.status,
            skill_match: flag.skill_match,
            layer: flag.layer,
          });
        }
      }
    } catch (persistErr) {
      // In local mode, ignore persistence errors
    }

    // 4. Compute Aggregate Statistics
    let clearCount = 0;
    let reviewCount = 0;
    let rejectedCount = 0;
    let skillDisguisedCount = 0;

    for (const res of auditResults) {
      if (res.status === "clear") clearCount++;
      else if (res.status === "review") {
        reviewCount++;
        if (res.layer === "skill") skillDisguisedCount++;
      } else if (res.status === "rejected") {
        rejectedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total_audited: auditResults.length,
        clear_count: clearCount,
        review_count: reviewCount,
        rejected_count: rejectedCount,
        skill_disguised_count: skillDisguisedCount,
      },
      flags: auditResults,
      historical_count: historicalList.length,
    });
  } catch (err: any) {
    console.error("[POST /api/questions/dedup error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to execute deduplication audit" },
      { status: 400 }
    );
  }
}
