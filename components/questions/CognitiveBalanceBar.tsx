import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Brain, Target, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { BloomLevelNames } from "@/lib/questions/types";

interface CognitiveBalanceBarProps {
  targetLower: number; // e.g. 40%
  targetHigher: number; // e.g. 60%
  actualLower: number; // e.g. 38%
  actualHigher: number; // e.g. 62%
  totalMarks: number;
  estimatedMinutes?: number;
  bloomDistribution?: Record<number, number>; // level -> marks
}

export function CognitiveBalanceBar({
  targetLower,
  targetHigher,
  actualLower,
  actualHigher,
  totalMarks,
  estimatedMinutes = 120,
  bloomDistribution,
}: CognitiveBalanceBarProps) {
  const isAligned = Math.abs(targetLower - actualLower) <= 5;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-md space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Cognitive Balance & Bloom&apos;s Alignment
            </h4>
            <p className="text-xs text-muted-foreground">
              Lower-Order (Recall/Understand) vs. Higher-Order (Apply/Analyze/Create)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/60">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Est. Duration: <strong className="text-foreground">{estimatedMinutes} mins</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {isAligned ? (
              <Badge variant="success" className="gap-1 text-[11px]">
                <CheckCircle2 className="h-3 w-3" />
                Target Balanced (±5%)
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 text-[11px]">
                <AlertTriangle className="h-3 w-3" />
                Slight Variance
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target Ratio */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-indigo-500" />
              Target Cognitive Ratio
            </span>
            <span className="text-foreground">
              {targetLower}% Lower / {targetHigher}% Higher
            </span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-indigo-500/70 transition-all duration-500"
              style={{ width: `${targetLower}%` }}
              title={`Target Lower Order: ${targetLower}%`}
            />
            <div
              className="bg-indigo-600 transition-all duration-500"
              style={{ width: `${targetHigher}%` }}
              title={`Target Higher Order: ${targetHigher}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Lower (L1–L2): {Math.round((totalMarks * targetLower) / 100)} Marks</span>
            <span>Higher (L3–L6): {Math.round((totalMarks * targetHigher) / 100)} Marks</span>
          </div>
        </div>

        {/* Actual Generated Ratio */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Actual Generated Ratio
            </span>
            <span className="text-foreground font-semibold">
              {actualLower}% Lower / {actualHigher}% Higher
            </span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-emerald-500/70 transition-all duration-500"
              style={{ width: `${actualLower}%` }}
              title={`Actual Lower Order: ${actualLower}%`}
            />
            <div
              className="bg-emerald-600 transition-all duration-500"
              style={{ width: `${actualHigher}%` }}
              title={`Actual Higher Order: ${actualHigher}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Lower: {Math.round((totalMarks * actualLower) / 100)} Marks</span>
            <span>Higher: {Math.round((totalMarks * actualHigher) / 100)} Marks</span>
          </div>
        </div>
      </div>

      {/* Bloom Level Detailed Pills */}
      {bloomDistribution && (
        <div className="pt-2 border-t border-border/50">
          <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Bloom&apos;s Taxonomy Mark Breakdown
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((level) => {
              const marks = bloomDistribution[level] || 0;
              const meta = BloomLevelNames[level];
              const pct = totalMarks > 0 ? Math.round((marks / totalMarks) * 100) : 0;

              return (
                <div
                  key={level}
                  className="rounded-xl border border-border/60 bg-background/50 p-2 text-center"
                >
                  <Badge variant={meta.variant} className="text-[10px] px-1.5 py-0 mb-1">
                    {meta.name}
                  </Badge>
                  <div className="text-xs font-bold text-foreground">
                    {marks} Marks
                  </div>
                  <div className="text-[10px] text-muted-foreground">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
