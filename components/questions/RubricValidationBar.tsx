"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  Save,
  Send,
  Sparkles,
  Lock,
} from "lucide-react";

interface RubricValidationBarProps {
  currentTotal: number;
  targetMarks: number;
  isPublished?: boolean;
  isSaving?: boolean;
  onAutoBalance: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function RubricValidationBar({
  currentTotal,
  targetMarks,
  isPublished = false,
  isSaving = false,
  onAutoBalance,
  onSaveDraft,
  onPublish,
}: RubricValidationBarProps) {
  const isMatch = Math.abs(currentTotal - targetMarks) < 0.01;
  const isOver = currentTotal > targetMarks;
  const isUnder = currentTotal < targetMarks;
  const percentage = targetMarks > 0 ? Math.min(100, (currentTotal / targetMarks) * 100) : 0;

  return (
    <div className="sticky bottom-4 z-20 p-4 rounded-xl border bg-card/95 backdrop-blur-md shadow-lg transition-all duration-300 border-border/80">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left Side: Auto-Sum Progress & Status */}
        <div className="space-y-1.5 flex-1 min-w-[260px]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Marks Allocation:
            </span>
            <span className="font-mono font-bold text-sm text-foreground">
              {currentTotal.toFixed(1)} / {targetMarks} pts
            </span>

            {isMatch ? (
              <Badge variant="success" className="gap-1 py-0.5 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Balanced & Validated
              </Badge>
            ) : isOver ? (
              <Badge variant="destructive" className="gap-1 py-0.5 text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Over by {(currentTotal - targetMarks).toFixed(1)} pts
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 py-0.5 text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Remaining {(targetMarks - currentTotal).toFixed(1)} pts
              </Badge>
            )}

            {isPublished && (
              <Badge variant="glass" className="gap-1 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <Lock className="h-3 w-3" /> Published for Track C
              </Badge>
            )}
          </div>

          {/* Progress Bar with Color Indicator */}
          <div className="w-full max-w-md">
            <Progress
              value={percentage}
              className={`h-2 ${
                isMatch
                  ? "[&>div]:bg-emerald-500"
                  : isOver
                  ? "[&>div]:bg-destructive"
                  : "[&>div]:bg-amber-500"
              }`}
            />
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          {!isMatch && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoBalance}
              className="gap-1.5 text-xs font-medium border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              <Scale className="h-3.5 w-3.5" />
              Auto-Balance
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="gap-1.5 text-xs font-medium"
          >
            <Save className="h-3.5 w-3.5 text-muted-foreground" />
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={onPublish}
            disabled={!isMatch || isSaving}
            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Send className="h-3.5 w-3.5" />
            {isPublished ? "Update & Re-Publish" : "Publish for Track C"}
          </Button>
        </div>
      </div>
    </div>
  );
}
