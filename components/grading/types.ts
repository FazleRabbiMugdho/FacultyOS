export interface RubricCriterion {
  label: string;
  max_marks: number;
  keywords?: string[];
  partial_credit_rule?: string;
  ecf_rule?: string;
}

export interface GradingQuestion {
  id: string;
  course_id: string;
  text: string;
  marks: number;
  rubrics: Array<{ id: string; criteria: RubricCriterion[]; total_marks: number }>;
}

export interface ExamScript {
  id: string;
  course_id: string;
  question_id: string | null;
  student_masked_id: string;
  storage_path: string | null;
  anonymized: boolean;
}

export interface GradeRecord {
  id: string;
  script_id: string;
  examiner_id: string | null;
  score: number;
  is_ai: boolean;
  confidence: number | null;
  rubric_selections: Array<{ label: string; awarded: number; reason?: string; maxMarks?: number }>;
  region_confidences: Array<{ region_label: string; confidence: number; note: string }> | null;
}

export interface ArbitrationRecord {
  id: string;
  script_id: string;
  s1: number;
  s2: number;
  delta: number;
  final_score: number | null;
  status: "pending" | "resolved" | "arbitration";
  disagreement_type: string | null;
  disagreement_profile: Array<{ label: string; e1: number; e2: number; maxMarks: number; gap: number; gapPercent: number }> | null;
}

export interface GradingContext {
  questions: GradingQuestion[];
  scripts: ExamScript[];
  grades: GradeRecord[];
  arbitrations: ArbitrationRecord[];
}
