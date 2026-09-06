export type DisagreementType =
  | "partial_credit"
  | "conceptual"
  | "ecf"
  | "mixed";

export interface CriterionScore {
  label: string;
  awarded: number;
  maxMarks: number;
  ecfApplied?: boolean;
}

export interface CriterionDifference {
  label: string;
  e1: number;
  e2: number;
  maxMarks: number;
  gap: number;
  gapPercent: number;
}

export function calculateDelta(
  score1: number,
  score2: number,
  totalMarks: number
): number {
  if (totalMarks <= 0) return 0;
  return (Math.abs(score1 - score2) / totalMarks) * 100;
}

export function buildDifferenceProfile(
  examiner1: CriterionScore[],
  examiner2: CriterionScore[]
): CriterionDifference[] {
  return examiner1.map((first, index) => {
    const second = examiner2[index] ?? {
      label: first.label,
      awarded: 0,
      maxMarks: first.maxMarks,
    };
    const gap = Math.abs(first.awarded - second.awarded);

    return {
      label: first.label,
      e1: first.awarded,
      e2: second.awarded,
      maxMarks: first.maxMarks,
      gap,
      gapPercent: first.maxMarks > 0 ? (gap / first.maxMarks) * 100 : 0,
    };
  });
}

export function classifyDisagreement(
  examiner1: CriterionScore[],
  examiner2: CriterionScore[]
): DisagreementType {
  const profile = buildDifferenceProfile(examiner1, examiner2);
  const substantial = profile.filter((item) => item.gapPercent >= 25);
  const conceptual = substantial.some(
    (item) => item.maxMarks >= 4 && item.gapPercent >= 50
  );
  const ecf = examiner1.some(
    (item, index) => item.ecfApplied !== examiner2[index]?.ecfApplied
  );

  if (conceptual && ecf) return "mixed";
  if (ecf) return "ecf";
  if (conceptual) return "conceptual";
  return substantial.length > 1 ? "mixed" : "partial_credit";
}
