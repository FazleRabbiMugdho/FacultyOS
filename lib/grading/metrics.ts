function assertPaired(a: number[], b: number[]) {
  if (a.length !== b.length) {
    throw new Error("Rating arrays must have equal length");
  }
}

export function meanAbsoluteDifference(a: number[], b: number[]): number {
  assertPaired(a, b);
  if (a.length === 0) return 0;
  return a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / a.length;
}

export function bias(a: number[], b: number[]): number {
  assertPaired(a, b);
  if (a.length === 0) return 0;
  return a.reduce((sum, value, index) => sum + (value - b[index]), 0) / a.length;
}

export function cohensKappa(a: number[], b: number[]): number {
  assertPaired(a, b);
  if (a.length === 0) return 0;

  const categories = Array.from(new Set([...a, ...b]));
  const observed = a.filter((value, index) => value === b[index]).length / a.length;
  const expected = categories.reduce((sum, category) => {
    const probabilityA = a.filter((value) => value === category).length / a.length;
    const probabilityB = b.filter((value) => value === category).length / b.length;
    return sum + probabilityA * probabilityB;
  }, 0);

  return expected === 1 ? 1 : (observed - expected) / (1 - expected);
}

export function scoreBand(score: number, totalMarks: number): number {
  if (totalMarks <= 0) return 0;
  const percentage = (score / totalMarks) * 100;
  if (percentage < 40) return 0;
  if (percentage < 55) return 1;
  if (percentage < 70) return 2;
  if (percentage < 85) return 3;
  return 4;
}

export const mad = meanAbsoluteDifference;
