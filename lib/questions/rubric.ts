import { Rubric, RubricCriterion, RubricSchema } from "./types";
import { generateJSON } from "@/lib/ai";
import { z } from "zod";

/**
 * Seeded high-quality mock rubrics with Error-Carried-Forward (ECF)
 * and partial credit rules for instant demo and Track C testing.
 */
export const SEEDED_MOCK_RUBRICS: Record<string, Rubric> = {
  // 1. Bayes' Theorem Question Rubric (8 Marks)
  "hist-bayes-01": {
    id: "rubric-bayes-01",
    question_id: "hist-bayes-01",
    total_marks: 8,
    is_published: true,
    rationale: "Granular 3-step evaluation isolating prior formulation, marginalization denominator, and posterior inference with Error-Carried-Forward protection.",
    criteria: [
      {
        id: "crit-b1",
        label: "1. Prior & Likelihood Identification",
        max_marks: 2,
        keywords: ["P(Spam)", "P(Ham)", "P(W|Spam)", "P(W|Ham)", "Prior", "Likelihood"],
        partial_credit_rule: "Award 1 mark if events are properly named with correct probabilities even if likelihood notation is informal.",
        ecf_rule: "Not applicable for step 1 base definitions.",
        guidance: "Check that P(Spam) + P(Ham) = 1.0. Deduct 0.5 for missing percentage conversion.",
      },
      {
        id: "crit-b2",
        label: "2. Law of Total Probability (Denominator)",
        max_marks: 3,
        keywords: ["Total Probability", "P(Word) = Σ P(Word|C)*P(C)", "Marginal Likelihood", "Denominator"],
        partial_credit_rule: "Award 1.5 marks if formula is stated correctly but student makes an arithmetic slip in multiplication.",
        ecf_rule: "ECF Protection: If prior probabilities from Step 1 were wrong, award full 3 marks if student correctly combines their Step 1 values into the denominator formula.",
        guidance: "Must show the sum of products: (P(W|S)*P(S) + P(W|H)*P(H)).",
      },
      {
        id: "crit-b3",
        label: "3. Posterior Calculation & Final Inference",
        max_marks: 3,
        keywords: ["Posterior", "P(Spam|Word)", "Bayes Formula", "Decision Threshold", "0.85"],
        partial_credit_rule: "Award 1.5 marks for correct algebraic quotient; award remaining 1.5 for numerical accuracy and final classification.",
        ecf_rule: "ECF Protection: If denominator from Step 2 had an arithmetic error, award full 3 marks if student correctly computes Numerator / (Step 2 value). Do not double-penalize.",
        guidance: "Final answer should conclude spam classification against standard 0.5 threshold.",
      },
    ],
  },

  // 2. Dijkstra's Algorithm Question Rubric (10 Marks)
  "gen-dijkstra-01": {
    id: "rubric-dijkstra-01",
    question_id: "gen-dijkstra-01",
    total_marks: 10,
    is_published: true,
    rationale: "4-phase criteria covering graph initialization, min-heap priority queue relaxation, shortest path tree reconstruction, and asymptotic time complexity.",
    criteria: [
      {
        id: "crit-d1",
        label: "1. Distance Array & Priority Queue Initialization",
        max_marks: 2,
        keywords: ["dist[src]=0", "dist[v]=infinity", "PriorityQueue / Min-Heap", "Visited set"],
        partial_credit_rule: "Award 1 mark if source is set to 0 and other vertices initialized, but priority queue structure is omitted.",
        ecf_rule: "Not applicable for initial state setup.",
        guidance: "Check that source distance is 0 and all other vertices are set to infinity.",
      },
      {
        id: "crit-d2",
        label: "2. Edge Relaxation & Greedy Vertex Selection Loop",
        max_marks: 4,
        keywords: ["dist[u] + weight(u,v) < dist[v]", "Extract-Min", "Relaxation", "Decrease-Key"],
        partial_credit_rule: "Award 2 marks if greedy selection is correct but edge relaxation condition is strictly non-strict (< vs <=).",
        ecf_rule: "ECF Protection: If an arithmetic addition error occurs during edge weight update on node A, award full credit for subsequent relaxations from node A if correctly calculated based on node A's value.",
        guidance: "Examiner should check vertex extraction order and accurate distance updates.",
      },
      {
        id: "crit-d3",
        label: "3. Path Reconstruction & Predecessor Pointer Updates",
        max_marks: 2,
        keywords: ["parent[v] = u", "Predecessor Array", "Backtracking / Traceback"],
        partial_credit_rule: "Award 1 mark if shortest distance is correct but explicit predecessor backpointers are not tracked.",
        ecf_rule: "ECF Protection: If one node distance was miscalculated in Step 2, award full 2 marks if predecessor path accurately reflects the minimum edges found.",
        guidance: "Ensure backtracking from target vertex reaches source vertex correctly.",
      },
      {
        id: "crit-d4",
        label: "4. Asymptotic Complexity Proof & Negative Weight Limitation",
        max_marks: 2,
        keywords: ["O((V + E) log V)", "Fibonacci heap O(E + V log V)", "Negative edge weights fail", "Greedy choice invalid"],
        partial_credit_rule: "Award 1 mark for stating time complexity correctly; award 1 mark for explaining why negative edge cycles cause failure.",
        ecf_rule: "Independent theoretical criterion.",
        guidance: "Must cite binary heap vs array implementation differences if asked.",
      },
    ],
  },

  // 3. Matrix Chain Multiplication DP Rubric (12 Marks)
  "gen-dp-01": {
    id: "rubric-dp-01",
    question_id: "gen-dp-01",
    total_marks: 12,
    is_published: true,
    rationale: "Comprehensive dynamic programming rubric with optimal substructure formulation, memoization/tabulation, and traceback parenthesization.",
    criteria: [
      {
        id: "crit-m1",
        label: "1. Optimal Substructure & Problem Characterization",
        max_marks: 3,
        keywords: ["Optimal Substructure", "Overlapping Subproblems", "Dimensions p[i-1] x p[k] x p[j]"],
        partial_credit_rule: "Award 1.5 marks if matrix dimensions are defined correctly but optimal substructure proof lacks formal phrasing.",
        ecf_rule: "Not applicable.",
        guidance: "Look for explicit split index k where i <= k < j.",
      },
      {
        id: "crit-m2",
        label: "2. Recurrence Relation & Base Cases",
        max_marks: 4,
        keywords: ["m[i,j] = min { m[i,k] + m[k+1,j] + p[i-1]p[k]p[j] }", "m[i,i] = 0", "Base Case"],
        partial_credit_rule: "Award 2 marks if base case m[i,i]=0 is present and summation term is correct, but min bound range is off by 1.",
        ecf_rule: "ECF Protection: If index notation uses 0-based vs 1-based indexing consistently throughout, do not penalize.",
        guidance: "Exact recurrence formula is mandatory for full marks.",
      },
      {
        id: "crit-m3",
        label: "3. Bottom-Up DP Table Construction",
        max_marks: 3,
        keywords: ["Chain Length L = 2 to n", "Table m[1..n, 1..n]", "Table s[1..n, 1..n]", "Diagonal computation"],
        partial_credit_rule: "Award 1.5 marks if loops iterate by diagonal length, but one table cell has an arithmetic slip.",
        ecf_rule: "ECF Protection: If a cell m[1,2] has an arithmetic mistake, award full marks for cell m[1,3] if it correctly combines m[1,2] using the algorithm.",
        guidance: "Ensure direction of filling is diagonal-by-diagonal (increasing chain length).",
      },
      {
        id: "crit-m4",
        label: "4. Optimal Parenthesization Output & Time Complexity",
        max_marks: 2,
        keywords: ["Print-Optimal-Parens(s, i, j)", "Traceback", "O(n^3) time", "O(n^2) space"],
        partial_credit_rule: "Award 1 mark for correct parenthesized expression; 1 mark for asymptotic complexity derivation.",
        ecf_rule: "ECF Protection: If s-table had one split point error, award full marks for parenthesization if it faithfully follows the s-table.",
        guidance: "Must show recursive traceback printing from s-table.",
      },
    ],
  },
};

/**
 * Normalizes criteria max_marks so that they sum to exact target marks
 */
export function normalizeRubricCriteria(criteria: RubricCriterion[], targetMarks: number): RubricCriterion[] {
  if (!criteria || criteria.length === 0) {
    return [
      {
        id: "crit-1",
        label: "Core Conceptual Mastery & Execution",
        max_marks: targetMarks,
        keywords: ["Methodology", "Correct Formulation", "Accuracy"],
        partial_credit_rule: "Award partial marks proportionally based on correctness of intermediate steps.",
        ecf_rule: "Error-Carried-Forward applies: do not penalize correct downstream derivations based on initial arithmetic slips.",
        guidance: "Standard holistic criterion.",
      },
    ];
  }

  const currentSum = criteria.reduce((sum, c) => sum + Number(c.max_marks || 0), 0);
  if (currentSum === targetMarks) return criteria;

  // Scale or adjust the largest criterion to absorb remainder
  const scale = targetMarks / currentSum;
  let runningSum = 0;

  const adjusted = criteria.map((c, idx) => {
    if (idx === criteria.length - 1) {
      // Last criterion takes the exact remainder to prevent rounding drifts
      const finalMark = Math.max(0.5, Math.round((targetMarks - runningSum) * 2) / 2);
      return { ...c, max_marks: finalMark };
    }
    const scaledMark = Math.max(0.5, Math.round(c.max_marks * scale * 2) / 2);
    runningSum += scaledMark;
    return { ...c, max_marks: scaledMark };
  });

  return adjusted;
}

/**
 * Generates an Analytic Rubric using Gemini AI with strict Error-Carried-Forward (ECF)
 * and partial credit instructions.
 */
export async function generateAnalyticRubric(params: {
  question_id: string;
  text: string;
  marks: number;
  bloom_level?: number;
  skill_signature?: string;
  co_code?: string;
  granularity?: "standard" | "detailed" | "step_by_step";
  custom_guidance?: string;
}): Promise<Rubric> {
  const { question_id, text, marks, bloom_level = 3, skill_signature, co_code, granularity = "detailed", custom_guidance } = params;

  const prompt = `You are a Senior University Examiner and Academic Assessment Specialist.
Create a highly rigorous, granular Analytic Marking Rubric for the following university exam question:

Question Details:
- Total Marks: ${marks}
- Bloom's Taxonomy Level: ${bloom_level}
- Associated Course Outcome: ${co_code || "CO1"}
${skill_signature ? `- Assessed Skill Signature: ${skill_signature}` : ""}
- Question Text: "${text}"
${custom_guidance ? `- Faculty Custom Guidance: "${custom_guidance}"` : ""}

Mandatory Assessment Guidelines:
1. Criteria Subdivision: Break down the grading into 3 to 5 logical, sequential criteria (e.g., Problem Identification / Mathematical Formulation / Algorithmic Execution / Asymptotic Analysis or Reflection).
2. Marks Sum Constraint: The sum of 'max_marks' across all criteria MUST EXACTLY EQUAL ${marks}. Do not exceed or fall short of ${marks}.
3. Explicit Partial Credit Rule: For EACH criterion, provide a clear, unambiguous rule on how partial marks (e.g. 50%, 25%) should be awarded for incomplete or partially correct student answers.
4. Error-Carried-Forward (ECF) Rule: For EACH criterion (especially downstream calculation/derivation steps), provide an explicit ECF non-penalty rule. Example: "If student makes an arithmetic slip in Step 1, but correctly applies the formula in Step 2 using their Step 1 result, award FULL marks for Step 2 without double penalty."
5. Keywords: Include 3 to 6 critical domain keywords, variable names, or formula terms that examiners should look for.

Generate a JSON object adhering strictly to the schema.`;

  const AiRubricSchema = z.object({
    rationale: z.string().describe("Explanation of criteria distribution and pedagogical focus"),
    criteria: z.array(
      z.object({
        label: z.string().describe("Descriptive criterion name"),
        max_marks: z.number().min(0.5).describe("Marks allocated to this criterion"),
        keywords: z.array(z.string()).describe("Key concepts, equations, and terms"),
        partial_credit_rule: z.string().describe("Explicit rule for granting partial marks"),
        ecf_rule: z.string().describe("Error-Carried-Forward non-penalty rule"),
        guidance: z.string().optional().describe("Examiner instructions or common misconceptions"),
      })
    ),
  });

  try {
    const aiResult = await generateJSON(prompt, AiRubricSchema);
    
    // Normalize and generate IDs
    const normalizedCriteria: RubricCriterion[] = aiResult.criteria.map((c, index) => ({
      id: `crit-${index + 1}-${Math.random().toString(36).substring(2, 7)}`,
      label: c.label,
      max_marks: Number(c.max_marks),
      keywords: c.keywords || [],
      partial_credit_rule: c.partial_credit_rule || "Award partial credit based on step progression.",
      ecf_rule: c.ecf_rule || "Error-Carried-Forward applies for all downstream derivations.",
      guidance: c.guidance || "Evaluate adherence to course standard methodology.",
    }));

    const finalCriteria = normalizeRubricCriteria(normalizedCriteria, marks);

    return {
      id: `rubric-${question_id}-${Date.now().toString(36)}`,
      question_id,
      total_marks: marks,
      criteria: finalCriteria,
      rationale: aiResult.rationale,
      is_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("AI Rubric generation encountered error, generating rule-based template:", error);
    
    // Fallback template
    const defaultCriteria: RubricCriterion[] = [
      {
        id: `crit-1-${Date.now()}`,
        label: "1. Problem Formulation & Theoretical Framework",
        max_marks: Math.max(1, Math.round(marks * 0.3)),
        keywords: ["Formula", "Definitions", "Variables", "Initial State"],
        partial_credit_rule: "Award 50% credit if core concept is identified with minor notation gaps.",
        ecf_rule: "Base criterion; foundational to subsequent steps.",
        guidance: "Ensure foundational concepts and variables are accurately declared.",
      },
      {
        id: `crit-2-${Date.now()}`,
        label: "2. Methodological Execution & Core Derivation",
        max_marks: Math.max(1, Math.round(marks * 0.4)),
        keywords: ["Calculation", "Step-by-step", "Algorithm", "Proof"],
        partial_credit_rule: "Award proportional marks based on number of correct steps.",
        ecf_rule: "ECF Protection: If an early arithmetic error occurs, evaluate downstream execution based on that intermediate value.",
        guidance: "Inspect intermediate logic independently from final arithmetic result.",
      },
      {
        id: `crit-3-${Date.now()}`,
        label: "3. Final Result, Interpretation & Boundary Analysis",
        max_marks: Math.max(1, marks - Math.round(marks * 0.3) - Math.round(marks * 0.4)),
        keywords: ["Conclusion", "Units", "Complexity", "Edge Cases"],
        partial_credit_rule: "Award partial credit if derivation is solid but final statement lacks unit/interpretation.",
        ecf_rule: "ECF Protection: Award full marks for conclusion if it logically follows from student's derived intermediate result.",
        guidance: "Check completeness of final answer and critical boundary analysis.",
      },
    ];

    return {
      id: `rubric-${question_id}-fallback`,
      question_id,
      total_marks: marks,
      criteria: normalizeRubricCriteria(defaultCriteria, marks),
      rationale: "Rule-based 3-tier analytic rubric with Error-Carried-Forward safeguard.",
      is_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
