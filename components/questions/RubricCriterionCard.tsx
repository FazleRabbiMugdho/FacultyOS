"use client";

import * as React from "react";
import { RubricCriterion } from "@/lib/questions/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  Zap,
  Tag,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface RubricCriterionCardProps {
  criterion: RubricCriterion;
  index: number;
  totalCount: number;
  onChange: (updated: RubricCriterion) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function RubricCriterionCard({
  criterion,
  index,
  totalCount,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: RubricCriterionCardProps) {
  const [newTag, setNewTag] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || e.type === "click") {
      e.preventDefault();
      if (!newTag.trim()) return;
      const cleanTag = newTag.trim();
      if (!criterion.keywords.includes(cleanTag)) {
        onChange({
          ...criterion,
          keywords: [...criterion.keywords, cleanTag],
        });
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({
      ...criterion,
      keywords: criterion.keywords.filter((t) => t !== tagToRemove),
    });
  };

  return (
    <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-all duration-200 overflow-hidden bg-card/60 backdrop-blur-xs">
      <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Step Number and Label */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
            <span className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold shrink-0">
              #{index + 1}
            </span>
            <Input
              value={criterion.label}
              onChange={(e) => onChange({ ...criterion, label: e.target.value })}
              className="h-8 font-semibold text-sm bg-background/80 border-border/60 focus-visible:ring-1"
              placeholder="Criterion Name / Step Description"
            />
          </div>

          {/* Marks Allocation & Card Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-background/90 px-2.5 py-1 rounded-lg border border-border/60">
              <span className="text-xs text-muted-foreground font-medium">Marks:</span>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={criterion.max_marks}
                onChange={(e) =>
                  onChange({
                    ...criterion,
                    max_marks: Math.max(0.5, parseFloat(e.target.value) || 0.5),
                  })
                }
                className="h-6 w-16 text-center font-mono font-bold text-xs p-0 border-0 focus-visible:ring-0"
              />
              <span className="text-[11px] font-semibold text-primary">pts</span>
            </div>

            {/* Position Reordering */}
            <div className="flex items-center border border-border/60 rounded-md bg-background/80">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none border-r border-border/40 disabled:opacity-30"
                disabled={!onMoveUp || index === 0}
                onClick={onMoveUp}
                title="Move Up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none disabled:opacity-30"
                disabled={!onMoveDown || index === totalCount - 1}
                onClick={onMoveDown}
                title="Move Down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Delete Criterion */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={onDelete}
              title="Delete Criterion"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5 text-xs">
        {/* Keywords & Formula Concepts Badges */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-primary" /> Key Concepts & Formula Terms:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 min-h-[28px] p-1.5 rounded-md bg-muted/30 border border-border/40">
            {criterion.keywords.map((kw, kwIdx) => (
              <Badge
                key={kwIdx}
                variant="secondary"
                className="text-[11px] px-2 py-0.5 gap-1 bg-background/90 border border-border/60 font-mono font-medium"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(kw)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}

            <div className="flex items-center gap-1 flex-1 min-w-[120px]">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Add keyword (Press Enter)"
                className="h-6 text-[11px] bg-transparent border-0 px-1 focus-visible:ring-0 placeholder:text-muted-foreground/60"
              />
              {newTag && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-primary"
                  onClick={handleAddTag}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Dual Rules Grid: Partial Credit + ECF */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Partial Credit Rule */}
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
              <Zap className="h-3.5 w-3.5" />
              <span>Partial Credit Rule</span>
            </div>
            <Textarea
              value={criterion.partial_credit_rule}
              onChange={(e) =>
                onChange({ ...criterion, partial_credit_rule: e.target.value })
              }
              rows={2}
              className="text-xs bg-background/80 border-amber-500/20 focus-visible:ring-amber-500/40 resize-none font-sans"
              placeholder="e.g. Award 50% marks if formula is stated correctly with minor arithmetic slips."
            />
          </div>

          {/* Error-Carried-Forward (ECF) Rule */}
          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Error-Carried-Forward (ECF)</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-cyan-600 border-cyan-500/30 px-1 py-0">
                Non-Penalty Rule
              </Badge>
            </div>
            <Textarea
              value={criterion.ecf_rule}
              onChange={(e) => onChange({ ...criterion, ecf_rule: e.target.value })}
              rows={2}
              className="text-xs bg-background/80 border-cyan-500/20 focus-visible:ring-cyan-500/40 resize-none font-sans"
              placeholder="e.g. If intermediate calculation in Step 1 is incorrect, do not double-penalize downstream derivation."
            />
          </div>
        </div>

        {/* Examiner Guidance / Misconceptions */}
        <div className="pt-1">
          <Input
            value={criterion.guidance || ""}
            onChange={(e) => onChange({ ...criterion, guidance: e.target.value })}
            placeholder="💡 Examiner Note / Common Student Misconceptions (optional)"
            className="h-7 text-xs bg-muted/20 border-border/40 text-muted-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </CardContent>
    </Card>
  );
}
