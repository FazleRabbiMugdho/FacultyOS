import { SEEDED_MOCK_RUBRICS } from "@/lib/questions/rubric";

export const DEMO_COURSE_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_QUESTION_ID = "22222222-2222-4222-8222-222222222222";

const sourceRubric = SEEDED_MOCK_RUBRICS["hist-bayes-01"];

export const DEMO_QUESTION = {
  id: DEMO_QUESTION_ID,
  course_id: DEMO_COURSE_ID,
  text: "A diagnostic test has known sensitivity, false-positive rate, and disease prevalence. Apply Bayes' theorem to find the posterior probability after a positive result.",
  marks: sourceRubric.total_marks,
  rubrics: [{
    id: "33333333-3333-4333-8333-333333333333",
    criteria: sourceRubric.criteria,
    total_marks: sourceRubric.total_marks,
  }],
};

interface DemoState {
  scripts: any[];
  grades: any[];
  arbitrations: any[];
  assignments: Array<{ script_id: string; examiner_role: "E1" | "E2" | "E3"; examiner_id: string }>;
}

const globalState = globalThis as typeof globalThis & { __facultyOsGradingDemo?: DemoState };

export const gradingDemoState: DemoState = globalState.__facultyOsGradingDemo ?? {
  scripts: [],
  grades: [],
  arbitrations: [],
  assignments: [],
};

globalState.__facultyOsGradingDemo = gradingDemoState;

export function demoContext() {
  return {
    questions: [DEMO_QUESTION],
    scripts: gradingDemoState.scripts,
    grades: gradingDemoState.grades,
    arbitrations: gradingDemoState.arbitrations,
    demo_mode: true,
  };
}
