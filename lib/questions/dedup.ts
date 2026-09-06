import { QuestionItem } from "./types";
import { HistoricalQuestion } from "./mock-historical";

export type DedupStatus = "clear" | "review" | "rejected";
export type DedupLayer = "semantic" | "lexical" | "skill" | "none";

export interface DedupFlagResult {
  question_id: string;
  question_text: string;
  module: string;
  marks: number;
  bloom_level: number;
  co_code: string;
  skill_signature: string;
  skill_tags: string[];
  
  // Matched historical question details
  matched_question_id: string | null;
  matched_question_text: string | null;
  matched_exam_info: string | null;
  matched_skill_signature: string | null;
  matched_skill_tags: string[] | null;

  // 3-Layer Metrics
  cosine: number; // Layer 1: Semantic (0.00 - 1.00)
  jaccard: number; // Layer 2: Lexical (0.00 - 1.00)
  skill_match: number; // Layer 3: Conceptual (0.00 - 1.00)

  status: DedupStatus;
  layer: DedupLayer;
  disguise_reason?: string;
  recommendation: string;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are",
  "was", "were", "be", "with", "as", "by", "that", "this", "from", "it", "each",
  "show", "write", "find", "give", "given", "using", "state", "compute", "calculate"
]);

/**
 * Clean & tokenize text into set of meaningful lexical terms
 */
export function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(cleaned);
}

/**
 * Layer 2: Lexical Jaccard Similarity on tokenized sets
 */
export function jaccard(textA: string, textB: string): number {
  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  const listA = Array.from(setA);
  for (let i = 0; i < listA.length; i++) {
    if (setB.has(listA[i])) {
      intersectionCount++;
    }
  }

  const unionSize = new Set([...listA, ...Array.from(setB)]).size;
  if (unionSize === 0) return 0;

  return Math.round((intersectionCount / unionSize) * 100) / 100;
}

/**
 * Cosine similarity between two vector embeddings
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.round(Math.max(0, Math.min(1, sim)) * 100) / 100;
}

/**
 * Layer 3: Conceptual Skill-Match
 * Blends skill_signature containment overlap with normalized concept tag intersection
 */
export function computeSkillMatch(
  sigA: string,
  sigB: string,
  tagsA: string[] = [],
  tagsB: string[] = []
): number {
  if (!sigA || !sigB) return 0;

  // 1. Signature lexical overlap
  const tokensA = Array.from(tokenize(sigA));
  const tokensB = Array.from(tokenize(sigB));
  const setB = new Set(tokensB);

  let sigInter = 0;
  for (const t of tokensA) {
    if (setB.has(t)) sigInter++;
  }
  const minSigSize = Math.min(tokensA.length, tokensB.length);
  const sigOverlap = minSigSize > 0 ? sigInter / minSigSize : 0;

  // 2. Skill tags token overlap (normalizing hyphenated / spaced tags)
  const tagWordsA = Array.from(new Set(tagsA.flatMap((t) => t.toLowerCase().replace(/[-_]/g, " ").split(/\s+/).filter((w) => w.length > 2))));
  const tagWordsB = Array.from(new Set(tagsB.flatMap((t) => t.toLowerCase().replace(/[-_]/g, " ").split(/\s+/).filter((w) => w.length > 2))));
  const setTagWordsB = new Set(tagWordsB);

  let tagInter = 0;
  for (const w of tagWordsA) {
    if (setTagWordsB.has(w)) tagInter++;
  }
  const minTagSize = Math.min(tagWordsA.length, tagWordsB.length);
  const tagOverlap = minTagSize > 0 ? tagInter / minTagSize : 0;

  // 3. Composite score (boosted when concept tags and signatures align)
  const composite = Math.max(sigOverlap, tagOverlap) * 0.70 + Math.min(sigOverlap, tagOverlap) * 0.30;
  return Math.round(Math.min(1.0, composite) * 100) / 100;
}

/**
 * Audit a single question against the historical exam bank across 3 layers
 */
export function auditQuestion(
  question: QuestionItem,
  historicalQuestions: HistoricalQuestion[],
  questionEmbedding?: number[],
  historicalEmbeddingsMap: Record<string, number[]> = {}
): DedupFlagResult {
  let highestCosine = 0;
  let highestJaccard = 0;
  let highestSkillMatch = 0;
  let matchedHist: HistoricalQuestion | null = null;
  let dominantLayer: DedupLayer = "none";
  let status: DedupStatus = "clear";
  let disguiseReason = "";
  let recommendation = "Original question. No historical conflict detected.";

  let bestPeakScore = 0;

  for (const hist of historicalQuestions) {
    // 1. Lexical Jaccard
    const jaccardScore = jaccard(question.text, hist.text);

    // 2. Semantic Cosine
    let cosineScore = 0;
    const histVec = historicalEmbeddingsMap[hist.id || ""];
    if (questionEmbedding && histVec) {
      cosineScore = cosineSimilarity(questionEmbedding, histVec);
    } else {
      // Robust heuristic fallback if embeddings aren't loaded in memory
      cosineScore = Math.min(1, Math.round((jaccardScore * 1.25 + (question.topic === hist.topic ? 0.35 : 0.1)) * 100) / 100);
    }

    // 3. Conceptual Skill Signature
    const skillScore = computeSkillMatch(
      question.skill_signature,
      hist.skill_signature,
      question.skill_tags,
      hist.skill_tags
    );

    const peakScore = Math.max(cosineScore, jaccardScore, skillScore);
    if (peakScore > bestPeakScore) {
      bestPeakScore = peakScore;
      highestCosine = cosineScore;
      highestJaccard = jaccardScore;
      highestSkillMatch = skillScore;
      matchedHist = hist;
    }
  }

  // Decision Rules
  if (matchedHist && bestPeakScore >= 0.25) {
    // Rule 1: High Semantic or Lexical overlap -> REJECTED
    if (highestCosine >= 0.75 || highestJaccard >= 0.55) {
      status = "rejected";
      dominantLayer = highestCosine >= 0.75 ? "semantic" : "lexical";
      recommendation = `High duplicate detected vs ${matchedHist.exam_year} (${matchedHist.semester}). Regenerate or replace question.`;
      disguiseReason = "Surface wording or structure is nearly identical to past exam paper.";
    }
    // Rule 2: ⭐ Layer 3 — Conceptual Skill Signature ("Same skill, different disguise")
    else if (highestSkillMatch >= 0.45 && highestJaccard < 0.40) {
      status = "review";
      dominantLayer = "skill";
      recommendation = `Same cognitive skill disguised in different domain context vs ${matchedHist.exam_year}. Review required to avoid testing predictability.`;
      disguiseReason = `Tested skill '${question.skill_signature}' matches historical question despite different story/numbers.`;
    }
    // Rule 3: Moderate Semantic similarity -> REVIEW
    else if (highestCosine >= 0.60) {
      status = "review";
      dominantLayer = "semantic";
      recommendation = `Moderate semantic overlap with ${matchedHist.exam_year}. Verify that parameters are sufficiently distinct.`;
      disguiseReason = "Shares significant semantic structure with past exam question.";
    }
  }

  return {
    question_id: question.id || `q_${Date.now()}`,
    question_text: question.text,
    module: question.module,
    marks: question.marks,
    bloom_level: question.bloom_level,
    co_code: question.co_code,
    skill_signature: question.skill_signature,
    skill_tags: question.skill_tags || [],
    matched_question_id: matchedHist?.id || null,
    matched_question_text: matchedHist?.text || null,
    matched_exam_info: matchedHist ? `${matchedHist.exam_year} (${matchedHist.semester})` : null,
    matched_skill_signature: matchedHist?.skill_signature || null,
    matched_skill_tags: matchedHist?.skill_tags || null,
    cosine: highestCosine,
    jaccard: highestJaccard,
    skill_match: highestSkillMatch,
    status,
    layer: dominantLayer,
    disguise_reason: disguiseReason || undefined,
    recommendation,
  };
}
