import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Target } from "lucide-react";

interface DedupScoreBarsProps {
  cosine: number;
  jaccard: number;
  skillMatch: number;
}

export function DedupScoreBars({ cosine, jaccard, skillMatch }: DedupScoreBarsProps) {
  const cosinePct = Math.round(cosine * 100);
  const jaccardPct = Math.round(jaccard * 100);
  const skillPct = Math.round(skillMatch * 100);

  const getScoreColor = (score: number, warnThresh: number, rejectThresh: number) => {
    if (score >= rejectThresh) return "bg-rose-500";
    if (score >= warnThresh) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Triple-Layer Similarity Scores
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Layer 1: Semantic Cosine */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              L1: Semantic
            </span>
            <span className="font-bold tabular-nums text-foreground">{cosinePct}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-500 ${getScoreColor(cosine, 0.70, 0.82)}`}
              style={{ width: `${cosinePct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Cosine vector</span>
            <span>Reject: ≥82%</span>
          </div>
        </div>

        {/* Layer 2: Lexical Jaccard */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <FileText className="h-3 w-3 text-cyan-500" />
              L2: Lexical
            </span>
            <span className="font-bold tabular-nums text-foreground">{jaccardPct}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-500 ${getScoreColor(jaccard, 0.45, 0.60)}`}
              style={{ width: `${jaccardPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Word overlap</span>
            <span>Reject: ≥60%</span>
          </div>
        </div>

        {/* Layer 3: Conceptual Skill Signature */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <Target className="h-3 w-3 text-amber-500" />
              ⭐ L3: Skill Match
            </span>
            <span className="font-bold tabular-nums text-foreground">{skillPct}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-500 ${getScoreColor(skillMatch, 0.70, 0.80)}`}
              style={{ width: `${skillPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Cognitive task</span>
            <span>Flag: ≥80%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
