import type {
  AIGeneratedBlueprintResult,
  AIGeneratedOutcomesResult,
} from "./schemas";

export function fallbackOutcomes(syllabus: string): AIGeneratedOutcomesResult {
  const normalized = syllabus.toLowerCase();
  const isArtificialIntelligence = /artificial intelligence|machine learning|search|expert system|natural language/.test(normalized);

  if (isArtificialIntelligence) {
    return {
      outcomes: [
        { code: "CO1", statement: "Explain foundational artificial intelligence concepts, agent models, and knowledge representations.", bloom_level: 2, action_verbs: ["explain", "describe"] },
        { code: "CO2", statement: "Apply informed and uninformed search strategies to solve structured state-space problems.", bloom_level: 3, action_verbs: ["apply", "solve"] },
        { code: "CO3", statement: "Analyze planning, game-playing, and decision-making techniques for intelligent agents.", bloom_level: 4, action_verbs: ["analyze", "compare"] },
        { code: "CO4", statement: "Evaluate machine-learning and perception methods for a specified intelligent-system task.", bloom_level: 5, action_verbs: ["evaluate", "assess"] },
        { code: "CO5", statement: "Design a knowledge-based intelligent solution that integrates reasoning and communication components.", bloom_level: 6, action_verbs: ["design", "construct"] },
      ],
    };
  }

  return {
    outcomes: [
      { code: "CO1", statement: "Explain the fundamental principles, terminology, and models presented in the course.", bloom_level: 2, action_verbs: ["explain", "describe"] },
      { code: "CO2", statement: "Apply course methods and procedures to solve representative problems.", bloom_level: 3, action_verbs: ["apply", "solve"] },
      { code: "CO3", statement: "Analyze complex problems by comparing relevant methods, assumptions, and results.", bloom_level: 4, action_verbs: ["analyze", "compare"] },
      { code: "CO4", statement: "Evaluate alternative solutions using measurable technical and contextual criteria.", bloom_level: 5, action_verbs: ["evaluate", "justify"] },
      { code: "CO5", statement: "Design an integrated solution that demonstrates mastery of the course concepts.", bloom_level: 6, action_verbs: ["design", "construct"] },
    ],
  };
}

export function fallbackCoPoMappings(
  outcomes: Array<{ code: string; bloom_level: number }>,
  programOutcomes: Array<{ code: string }>
) {
  const preferred = programOutcomes.slice(0, 5).map((item) => item.code);
  return {
    mappings: outcomes.flatMap((outcome, index) => {
      const primary = preferred[index % preferred.length];
      const secondary = preferred[(index + 1) % preferred.length];
      return [
        { co_code: outcome.code, po_code: primary, weight: Math.min(3, Math.max(1, Math.ceil(outcome.bloom_level / 2))), rationale: "Primary cognitive alignment." },
        { co_code: outcome.code, po_code: secondary, weight: outcome.bloom_level >= 4 ? 2 : 1, rationale: "Supporting application alignment." },
      ];
    }),
  };
}

export function fallbackBlueprint(mode: "planned" | "drift_aware"): AIGeneratedBlueprintResult {
  const topics = [
    { module: "Module 1", topic: "Foundations and Core Concepts", planned_weight: 25, actual_weight: 25, drift: 0, drift_explanation: "Delivered according to the planned schedule." },
    { module: "Module 2", topic: "Problem Solving and Applied Methods", planned_weight: 30, actual_weight: 35, drift: 5, drift_explanation: "Additional instructional depth was delivered." },
    { module: "Module 3", topic: "Analysis and Intelligent Decision Making", planned_weight: 25, actual_weight: 25, drift: 0, drift_explanation: "Coverage remained aligned with the syllabus." },
    { module: "Module 4", topic: "Advanced Systems and Evaluation", planned_weight: 20, actual_weight: 15, drift: -5, drift_explanation: "Compressed delivery reduced the fair assessment weight." },
  ];

  return {
    name: mode === "drift_aware" ? "Drift-Aware Final Exam Blueprint" : "Planned Final Exam Blueprint",
    topics: topics.map((topic) => ({
      ...topic,
      weight_percent: mode === "drift_aware" ? topic.actual_weight : topic.planned_weight,
    })),
    reasoning_summary: mode === "drift_aware"
      ? "Weights reflect delivered instructional volume and reduce emphasis on compressed content."
      : "Weights follow the planned syllabus allocation.",
  };
}