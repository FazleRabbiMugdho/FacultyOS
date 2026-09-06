export interface MockCourseOutcome {
  id: string;
  code: string;
  statement: string;
  bloom_level: number;
  action_verbs: string[];
}

export interface MockBlueprintTopic {
  id: string;
  module: string;
  topic: string;
  weight_percent: number;
  planned_weight?: number;
  actual_weight?: number;
  drift?: number;
}

export interface MockCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  credit_hours: number;
  outcomes: MockCourseOutcome[];
  blueprints: Array<{
    id: string;
    name: string;
    topics: MockBlueprintTopic[];
  }>;
}

export const MOCK_COURSES: MockCourse[] = [
  {
    id: "course-cs301",
    code: "CS301",
    title: "Data Structures & Algorithm Design",
    description: "Core algorithms, asymptotic complexity, graph traversal, and dynamic programming.",
    credit_hours: 4,
    outcomes: [
      {
        id: "co-1",
        code: "CO1",
        statement: "Analyze runtime and space complexity of iterative and recursive algorithms using Big-O notation.",
        bloom_level: 4,
        action_verbs: ["Analyze", "Calculate", "Compare"],
      },
      {
        id: "co-2",
        code: "CO2",
        statement: "Implement self-balancing search trees (AVL/Red-Black) and hash tables for key-value storage.",
        bloom_level: 3,
        action_verbs: ["Implement", "Construct", "Execute"],
      },
      {
        id: "co-3",
        code: "CO3",
        statement: "Design optimal graph algorithms including Dijkstra's, Prim's, and Bellman-Ford for network problems.",
        bloom_level: 6,
        action_verbs: ["Design", "Formulate", "Synthesize"],
      },
      {
        id: "co-4",
        code: "CO4",
        statement: "Evaluate problem decomposition strategies using Dynamic Programming versus Greedy paradigms.",
        bloom_level: 5,
        action_verbs: ["Evaluate", "Appraise", "Justify"],
      },
      {
        id: "co-5",
        code: "CO5",
        statement: "State and define fundamental asymptotic bounds (Big-O, Omega, Theta) and master theorem cases.",
        bloom_level: 1,
        action_verbs: ["Define", "State", "Identify"],
      },
    ],
    blueprints: [
      {
        id: "bp-cs301-mid",
        name: "Mid-Semester Examination Blueprint (OBE Aligned)",
        topics: [
          {
            id: "topic-1",
            module: "Module 1: Asymptotic Analysis & Recursion",
            topic: "Big-O Analysis, Master Theorem, and Recurrence Relations",
            weight_percent: 30,
            planned_weight: 30,
            actual_weight: 30,
            drift: 0,
          },
          {
            id: "topic-2",
            module: "Module 2: Advanced Data Structures",
            topic: "AVL Trees, Red-Black Rotations, and Hash Table Collisions",
            weight_percent: 35,
            planned_weight: 30,
            actual_weight: 35,
            drift: 5,
          },
          {
            id: "topic-3",
            module: "Module 3: Graph Algorithms",
            topic: "Dijkstra Shortest Path, Minimum Spanning Trees (Kruskal/Prim)",
            weight_percent: 35,
            planned_weight: 40,
            actual_weight: 35,
            drift: -5,
          },
        ],
      },
    ],
  },
  {
    id: "course-ai402",
    code: "AI402",
    title: "Artificial Intelligence & Probabilistic Reasoning",
    description: "Search algorithms, probabilistic models, Bayesian networks, and supervised learning fundamentals.",
    credit_hours: 3,
    outcomes: [
      {
        id: "co-ai-1",
        code: "CO1",
        statement: "Formulate state-space search formulations with A* and heuristic admissibility.",
        bloom_level: 3,
        action_verbs: ["Formulate", "Apply", "Compute"],
      },
      {
        id: "co-ai-2",
        code: "CO2",
        statement: "Apply Bayes' rule and conditional independence to compute multi-variable posterior probabilities.",
        bloom_level: 3,
        action_verbs: ["Calculate", "Apply", "Determine"],
      },
      {
        id: "co-ai-3",
        code: "CO3",
        statement: "Analyze Markov Decision Processes using value iteration and policy iteration algorithms.",
        bloom_level: 4,
        action_verbs: ["Analyze", "Examine", "Derive"],
      },
    ],
    blueprints: [
      {
        id: "bp-ai402-final",
        name: "Comprehensive Assessment Blueprint",
        topics: [
          {
            id: "topic-ai-1",
            module: "Module 1: Search & Heuristics",
            topic: "State Space, A* Admissibility, and Adversarial Minimax",
            weight_percent: 40,
          },
          {
            id: "topic-ai-2",
            module: "Module 2: Probabilistic Reasoning",
            topic: "Bayes' Theorem, Bayesian Belief Networks, and Inference",
            weight_percent: 60,
          },
        ],
      },
    ],
  },
];
