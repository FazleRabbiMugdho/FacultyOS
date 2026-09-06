import { QuestionItem } from "./types";

export interface HistoricalQuestion extends QuestionItem {
  exam_year: string;
  semester: string;
  course_code: string;
}

export const MOCK_HISTORICAL_QUESTIONS: HistoricalQuestion[] = [
  // 1. Semantic Near-Duplicate of Dijkstra
  {
    id: "hist-cs301-2024-q1",
    course_code: "CS301",
    exam_year: "Fall 2024",
    semester: "Mid-Term",
    module: "Module 3: Graph Algorithms",
    topic: "Dijkstra Shortest Path",
    text: "For the weighted undirected graph G=(V,E) with 6 vertices, trace Dijkstra's algorithm starting from source vertex 'A'. Show the distance table at every step and write the final shortest path tree.",
    marks: 10,
    bloom_level: 3,
    co_code: "CO3",
    skill_signature: "execute Dijkstra algorithm single-source shortest path step-by-step",
    skill_tags: ["graphs", "dijkstra", "shortest-path", "execution"],
    source: "historical",
  },
  // 2. ⭐ Conceptual / Disguised Duplicate (Medical Diagnosis Bayes' Rule)
  // When Track B generates a spam filter Bayes problem ("A spam filter detects spam with 99% accuracy..."),
  // this historical question tests the EXACT SAME 2-variable posterior skill in medical wording!
  {
    id: "hist-ai402-2023-q4",
    course_code: "AI402",
    exam_year: "Spring 2023",
    semester: "Final Exam",
    module: "Module 2: Probabilistic Reasoning",
    topic: "Bayesian Inference",
    text: "A rare medical disease affects 0.5% of the population. A diagnostic test has a 98% true positive rate and a 3% false positive rate. If a randomly selected patient tests positive, compute the posterior probability that they actually have the disease using Bayes' Rule.",
    marks: 8,
    bloom_level: 3,
    co_code: "CO2",
    skill_signature: "apply Bayes' theorem to calculate 2-variable posterior given sensitivity and base-rate prevalence",
    skill_tags: ["probability", "bayes-rule", "posterior-probability", "sensitivity-specificity"],
    source: "historical",
  },
  // 3. Recurrence Master Theorem
  {
    id: "hist-cs301-2023-q2",
    course_code: "CS301",
    exam_year: "Fall 2023",
    semester: "Mid-Term",
    module: "Module 1: Asymptotic Analysis & Recursion",
    topic: "Master Theorem & Recurrence Relations",
    text: "State the three cases of the Master Theorem. Using this theorem, derive the asymptotic bound for the recurrence T(n) = 4T(n/2) + Theta(n^2). Justify which case applies.",
    marks: 8,
    bloom_level: 4,
    co_code: "CO1",
    skill_signature: "apply Master Theorem cases to derive asymptotic complexity of divide-and-conquer recurrence",
    skill_tags: ["recurrence", "master-theorem", "complexity-analysis", "divide-and-conquer"],
    source: "historical",
  },
  // 4. AVL Tree Rotations
  {
    id: "hist-cs301-2024-q3",
    course_code: "CS301",
    exam_year: "Spring 2024",
    semester: "Mid-Term",
    module: "Module 2: Advanced Data Structures",
    topic: "AVL Trees & Balance Factors",
    text: "Starting with an empty AVL tree, insert keys [15, 20, 24, 10, 13, 7, 30, 36, 25] sequentially. Show the tree after each rebalancing rotation (LL, RR, LR, RL) and state the resulting balance factors.",
    marks: 10,
    bloom_level: 3,
    co_code: "CO2",
    skill_signature: "construct balanced AVL tree with rotation rebalancing upon sequential key insertion",
    skill_tags: ["avl-tree", "rotations", "binary-search-tree", "balance-factor"],
    source: "historical",
  },
  // 5. Dynamic Programming 0/1 Knapsack
  {
    id: "hist-cs301-2023-q5",
    course_code: "CS301",
    exam_year: "Fall 2023",
    semester: "Final Exam",
    module: "Module 4: Dynamic Programming",
    topic: "0/1 Knapsack & Memoization",
    text: "Write the dynamic programming recurrence relation for the 0/1 Knapsack problem with capacity W and items {w_i, v_i}. Fill the 2D DP table for W=7 and items {(2,3), (3,4), (4,5), (5,6)}.",
    marks: 12,
    bloom_level: 5,
    co_code: "CO4",
    skill_signature: "formulate 2D dynamic programming table and optimal value recurrence for 0/1 Knapsack",
    skill_tags: ["dynamic-programming", "knapsack", "recurrence-relation", "optimization"],
    source: "historical",
  },
];
