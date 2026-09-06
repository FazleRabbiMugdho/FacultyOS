/**
 * Seed Script: scripts/seed-demo.ts
 * Prepares demo records for Wave 0 / Wave 1 testing
 */

export const DEMO_COURSE = {
  id: "c1111111-1111-1111-1111-111111111111",
  code: "CS301",
  title: "Data Structures & Algorithm Design",
  description:
    "Comprehensive study of fundamental data structures, graph algorithms, dynamic programming, and computational complexity analysis.",
  credit_hours: 4,
};

export const DEMO_COURSE_OUTCOMES = [
  {
    id: "co111111-1111-1111-1111-111111111111",
    course_id: DEMO_COURSE.id,
    code: "CO1",
    statement: "Analyze asymptotic runtime complexity of iterative and recursive algorithms using Big-O, Omega, and Theta notations.",
    bloom_level: 4,
    action_verbs: ["Analyze", "Calculate", "Compare"],
  },
  {
    id: "co222222-2222-2222-2222-222222222222",
    course_id: DEMO_COURSE.id,
    code: "CO2",
    statement: "Implement balanced binary search trees, hash tables, and priority queues for efficient data retrieval and storage.",
    bloom_level: 3,
    action_verbs: ["Implement", "Construct", "Execute"],
  },
  {
    id: "co333333-3333-3333-3333-333333333333",
    course_id: DEMO_COURSE.id,
    code: "CO3",
    statement: "Design optimal graph algorithms including Dijkstra's, Kruskal's, and Bellman-Ford for network routing problems.",
    bloom_level: 6,
    action_verbs: ["Design", "Formulate", "Synthesize"],
  },
  {
    id: "co444444-4444-4444-4444-444444444444",
    course_id: DEMO_COURSE.id,
    code: "CO4",
    statement: "Evaluate problem decomposition strategies using Dynamic Programming versus Divide-and-Conquer paradigms.",
    bloom_level: 5,
    action_verbs: ["Evaluate", "Appraise", "Justify"],
  },
];

export const DEMO_BLUEPRINT = {
  id: "b1111111-1111-1111-1111-111111111111",
  course_id: DEMO_COURSE.id,
  name: "Mid-Term Examination Blueprint (Drift-Aware)",
  topics: [
    {
      module: "Module 1",
      topic: "Asymptotic Analysis & Recurrences",
      weight_percent: 25,
      planned_weight: 25,
      actual_weight: 25,
      drift: 0,
    },
    {
      module: "Module 2",
      topic: "Balanced Trees & Hash Tables",
      weight_percent: 35,
      planned_weight: 30,
      actual_weight: 35,
      drift: 5, // Taught more than planned
    },
    {
      module: "Module 3",
      topic: "Graph Traversal & Shortest Path",
      weight_percent: 40,
      planned_weight: 45,
      actual_weight: 40,
      drift: -5, // Under-taught, downweighted to be fair
    },
  ],
};

export const DEMO_HISTORICAL_QUESTIONS = [
  {
    id: "q_hist_1",
    course_id: DEMO_COURSE.id,
    text: "Given an undirected weighted graph G=(V,E), execute Dijkstra's algorithm from source vertex 'A' and write down the final distance array.",
    marks: 10,
    bloom_level: 3,
    source: "historical",
    skill_signature: "execute Dijkstra algorithm single-source shortest path step-by-step",
    skill_tags: ["graphs", "dijkstra", "shortest-path", "execution"],
  },
  {
    id: "q_hist_2",
    course_id: DEMO_COURSE.id,
    text: "Derive the tight asymptotic bound T(n) = 2T(n/2) + O(n log n) using the Master Method or recursion tree analysis.",
    marks: 8,
    bloom_level: 4,
    source: "historical",
    skill_signature: "solve recurrence relation with non-polynomial driving function",
    skill_tags: ["recurrence", "master-theorem", "complexity-analysis"],
  },
];

console.log("Demo seed definitions loaded successfully.");
