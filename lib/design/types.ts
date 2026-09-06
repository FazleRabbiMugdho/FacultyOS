export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface BloomInfo {
  level: BloomLevel;
  name: string;
  category: "Lower-Order" | "Higher-Order";
  verbs: string[];
  description: string;
  badgeVariant: "bloom1" | "bloom2" | "bloom3" | "bloom4" | "bloom5" | "bloom6";
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const BLOOM_TAXONOMY: Record<BloomLevel, BloomInfo> = {
  1: {
    level: 1,
    name: "Remember",
    category: "Lower-Order",
    verbs: ["recall", "define", "identify", "list", "name", "state", "recognize", "duplicate", "repeat"],
    description: "Recall facts, fundamental terms, and basic concepts",
    badgeVariant: "bloom1",
    colorClass: "text-blue-500 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
  },
  2: {
    level: 2,
    name: "Understand",
    category: "Lower-Order",
    verbs: ["explain", "classify", "describe", "discuss", "summarize", "interpret", "translate", "paraphrase"],
    description: "Explain ideas, principles, and conceptual models",
    badgeVariant: "bloom2",
    colorClass: "text-cyan-500 dark:text-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20",
  },
  3: {
    level: 3,
    name: "Apply",
    category: "Lower-Order",
    verbs: ["apply", "solve", "implement", "execute", "demonstrate", "compute", "calculate", "illustrate", "operate"],
    description: "Execute procedures and apply formulas to solve novel problems",
    badgeVariant: "bloom3",
    colorClass: "text-emerald-500 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
  },
  4: {
    level: 4,
    name: "Analyze",
    category: "Higher-Order",
    verbs: ["analyze", "differentiate", "organize", "deconstruct", "compare", "contrast", "distinguish", "examine"],
    description: "Deconstruct systems into parts and explore relationships",
    badgeVariant: "bloom4",
    colorClass: "text-amber-500 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
  },
  5: {
    level: 5,
    name: "Evaluate",
    category: "Higher-Order",
    verbs: ["evaluate", "critique", "justify", "defend", "judge", "assess", "appraise", "validate", "rate"],
    description: "Appraise value, justify decisions, and critique methodologies",
    badgeVariant: "bloom5",
    colorClass: "text-purple-500 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/20",
  },
  6: {
    level: 6,
    name: "Create",
    category: "Higher-Order",
    verbs: ["design", "construct", "formulate", "synthesize", "develop", "devise", "architect", "invent", "produce"],
    description: "Formulate new solutions, architectures, or original synthesis",
    badgeVariant: "bloom6",
    colorClass: "text-rose-500 dark:text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
  },
};

export interface Course {
  id: string;
  owner?: string | null;
  code: string;
  title: string;
  description?: string | null;
  credit_hours: number;
  created_at: string;
}

export interface CourseOutcome {
  id: string;
  course_id: string;
  code: string;
  statement: string;
  bloom_level: BloomLevel;
  action_verbs: string[];
  created_at?: string;
}

export interface ProgramOutcome {
  id: string;
  code: string;
  description: string;
  created_at?: string;
}

export interface CoPoMapping {
  id?: string;
  co_id: string;
  po_id: string;
  weight: 1 | 2 | 3;
  created_at?: string;
}

export interface CoPoMatrixResponse {
  course_outcomes: CourseOutcome[];
  program_outcomes: ProgramOutcome[];
  mappings: CoPoMapping[];
  sparsity_percent: number;
  total_cells: number;
  mapped_cells: number;
}

export interface DocumentRecord {
  id: string;
  course_id: string;
  type: "syllabus" | "slides" | "past_paper";
  storage_path?: string | null;
  extracted_text?: string | null;
  planned_at?: string | null;
  taught_at?: string | null;
  created_at: string;
}
