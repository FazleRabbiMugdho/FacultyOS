import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0%";
  return `${Math.round(val * 10) / 10}%`;
}

export function formatScore(score: number | null | undefined, max?: number): string {
  if (score === null || score === undefined || isNaN(score)) return "—";
  if (max !== undefined) return `${score}/${max}`;
  return `${score}`;
}
