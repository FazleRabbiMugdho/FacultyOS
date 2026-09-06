import * as React from "react";
import { DedupFlagResult } from "@/lib/questions/dedup";
import { QuestionItem, BloomLevelNames } from "@/lib/questions/types";
import { DedupScoreBars } from "./DedupScoreBars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Check,
  Sparkles,
  Target,
  Clock,
  History,
  Tag,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface DedupComparisonCardProps {
  flag: DedupFlagResult;
  index: number;
  onKeep: (questionId: string) => void;
  onReject: (questionId: string) => void;
  onReroll: (flag: DedupFlagResult) => Promise<void>;
}

export function DedupComparisonCard({
  flag,
  index,
  onKeep,
  onReject,
  onReroll,
}: DedupComparisonCardProps) {
  const [rerolling, setRerolling] = React.useState(false);

  const statusConfig = {
    clear: {
      label: "Original (Clear)",
      variant: "success" as const,
      icon: ShieldCheck,
    },
    review: {
      label: flag.layer === "skill" ? "⭐ Disguised Duplicate" : "Needs Review",
      variant: "warning" as const,
      icon: AlertTriangle,
    },
    rejected: {
      label: "Duplicate (Rejected)",
      variant: "danger" as const,
      icon: XCircle,
    },
  }[flag.status];

  const bloomMeta = BloomLevelNames[flag.bloom_level] || BloomLevelNames[3];

  const handleRerollClick = async () => {
    setRerolling(true);
    try {
      await onReroll(flag);
    } finally {
      setRerolling(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border bg-card/80 p-5 shadow-sm transition-all duration-200 backdrop-blur-sm space-y-4 ${
        flag.status === "rejected"
          ? "border-rose-500/40 bg-rose-500/[0.02]"
          : flag.layer === "skill"
          ? "border-amber-500/40 bg-amber-500/[0.02]"
          : "border-border/80"
      }`}
    >
      {/* Card Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
            Q{index + 1}
          </span>
          <span className="text-xs font-semibold text-foreground">{flag.module}</span>

          <Badge variant={statusConfig.variant} className="gap-1 text-xs">
            <statusConfig.icon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </Badge>

          <Badge variant={bloomMeta.variant} className="text-xs">
            {bloomMeta.name}
          </Badge>

          <Badge variant="outline" className="text-xs font-semibold">
            {flag.marks}M
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {flag.status !== "clear" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs rounded-xl"
              onClick={() => onKeep(flag.question_id)}
            >
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Keep Anyway
            </Button>
          )}

          {flag.status === "review" && (
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5 text-xs rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleRerollClick}
              disabled={rerolling}
            >
              <RotateCcw className={`h-3.5 w-3.5 ${rerolling ? "animate-spin" : ""}`} />
              {rerolling ? "Re-rolling..." : "Regenerate Variant"}
            </Button>
          )}

          {flag.status === "rejected" && (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 gap-1 text-xs rounded-xl"
              onClick={handleRerollClick}
              disabled={rerolling}
            >
              <RotateCcw className={`h-3.5 w-3.5 ${rerolling ? "animate-spin" : ""}`} />
              {rerolling ? "Replacing..." : "Replace Duplicate"}
            </Button>
          )}
        </div>
      </div>

      {/* ⭐ Differentiator Alert: Disguised Cognitive Skill Callout */}
      {flag.layer === "skill" && flag.disguise_reason && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-1.5 text-xs text-amber-700 dark:text-amber-300">
          <div className="font-bold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            Layer 3 Flag: Same Skill, Different Disguise Detected
          </div>
          <p className="leading-relaxed text-muted-foreground dark:text-amber-200/90">
            {flag.disguise_reason}
          </p>
        </div>
      )}

      {/* Side-by-Side Comparison (if matched) */}
      {flag.matched_question_text ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Generated Question */}
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-primary">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Current Generated Question
              </span>
              <span className="text-muted-foreground">{flag.co_code}</span>
            </div>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {flag.question_text}
            </p>
            <div className="pt-2 border-t border-border/40 text-[11px] space-y-1 text-muted-foreground">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <Target className="h-3 w-3 text-indigo-500" />
                Skill: {flag.skill_signature}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {flag.skill_tags.map((t, idx) => (
                  <span key={idx} className="rounded bg-muted px-1.5 py-0.2 text-[9px]">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Matched Historical Question */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1 text-foreground">
                <History className="h-3.5 w-3.5 text-amber-500" />
                Historical Exam Match
              </span>
              <Badge variant="outline" className="text-[10px]">
                {flag.matched_exam_info}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
              {flag.matched_question_text}
            </p>
            <div className="pt-2 border-t border-border/40 text-[11px] space-y-1 text-muted-foreground">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <Target className="h-3 w-3 text-amber-500" />
                Skill: {flag.matched_skill_signature}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {flag.matched_skill_tags?.map((t, idx) => (
                  <span key={idx} className="rounded bg-muted px-1.5 py-0.2 text-[9px]">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Clean Question Statement */
        <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-2">
          <p className="text-xs font-medium text-foreground leading-relaxed">
            {flag.question_text}
          </p>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3 w-3 text-indigo-500" />
            <span>Skill Signature: <strong>{flag.skill_signature}</strong></span>
          </div>
        </div>
      )}

      {/* Triple-Layer Score Bars */}
      <DedupScoreBars
        cosine={flag.cosine}
        jaccard={flag.jaccard}
        skillMatch={flag.skill_match}
      />
    </div>
  );
}
