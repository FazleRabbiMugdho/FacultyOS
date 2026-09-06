"use client";

import * as React from "react";
import { type CourseOutcome, type BloomLevel, BLOOM_TAXONOMY } from "@/lib/design/types";
import { BloomBadge } from "./BloomBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Tag, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface OutcomeCardProps {
  outcome: CourseOutcome;
  onUpdate: (updated: CourseOutcome) => void;
  onDelete: (id: string) => void;
}

export function OutcomeCard({ outcome, onUpdate, onDelete }: OutcomeCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Edit form state
  const [code, setCode] = React.useState(outcome.code);
  const [statement, setStatement] = React.useState(outcome.statement);
  const [bloomLevel, setBloomLevel] = React.useState<BloomLevel>(outcome.bloom_level);
  const [verbsInput, setVerbsInput] = React.useState(
    (outcome.action_verbs || []).join(", ")
  );

  const handleSave = async () => {
    if (!statement.trim() || !code.trim()) {
      toast.error("Code and statement cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const verbs = verbsInput
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch(`/api/design/outcomes/${outcome.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          statement: statement.trim(),
          bloom_level: bloomLevel,
          action_verbs: verbs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update outcome");
      }

      onUpdate(data.outcome);
      setIsEditing(false);
      toast.success(`Outcome ${data.outcome.code} updated`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save outcome");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/design/outcomes/${outcome.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete outcome");
      }

      onDelete(outcome.id);
      toast.success(`Outcome ${outcome.code} removed`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete outcome");
      setIsDeleting(false);
    }
  };

  const bloomInfo = BLOOM_TAXONOMY[outcome.bloom_level] || BLOOM_TAXONOMY[1];

  return (
    <>
      <div className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-md">
        <div className="space-y-3">
          {/* Top Bar: Code + Bloom Badge + Quick Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                {outcome.code}
              </span>
              <BloomBadge level={outcome.bloom_level} />
            </div>

            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => {
                  setCode(outcome.code);
                  setStatement(outcome.statement);
                  setBloomLevel(outcome.bloom_level);
                  setVerbsInput((outcome.action_verbs || []).join(", "));
                  setIsEditing(true);
                }}
                title="Edit Course Outcome"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete Outcome"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Statement */}
          <p className="text-sm font-medium text-foreground leading-relaxed pt-1">
            {outcome.statement}
          </p>

          {/* Action Verbs Tags */}
          {outcome.action_verbs && outcome.action_verbs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
                <Tag className="h-3 w-3" /> Verbs:
              </span>
              {outcome.action_verbs.map((verb, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground border border-border/50"
                >
                  {verb}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer Micro-indicator */}
        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
          <span>{bloomInfo.category} Cognitive Skill</span>
          <span className="font-mono text-[10px] text-muted-foreground/80">
            {bloomInfo.name}
          </span>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl border-border/80 glass-panel">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="h-4 w-4" />
              Outcome Editor
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight">
              Edit Course Outcome ({outcome.code})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify the outcome code, statement, Bloom cognitive level, and active verbs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="edit-code" className="text-xs font-semibold">
                  Code
                </Label>
                <Input
                  id="edit-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="edit-bloom" className="text-xs font-semibold">
                  Revised Bloom's Level
                </Label>
                <Select
                  value={String(bloomLevel)}
                  onValueChange={(val) => setBloomLevel(Number(val) as BloomLevel)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select Bloom level" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {[1, 2, 3, 4, 5, 6].map((lvl) => {
                      const item = BLOOM_TAXONOMY[lvl as BloomLevel];
                      return (
                        <SelectItem key={lvl} value={String(lvl)} className="rounded-lg">
                          <span className="font-semibold mr-2">Level {lvl}:</span>
                          {item.name} ({item.category})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-statement" className="text-xs font-semibold">
                Measurable Statement
              </Label>
              <Textarea
                id="edit-statement"
                rows={3}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                className="rounded-xl resize-none text-xs leading-relaxed"
                placeholder="Start with an active verb (e.g. Design dynamic programming algorithms...)"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-verbs" className="text-xs font-semibold">
                Action Verbs (comma separated)
              </Label>
              <Input
                id="edit-verbs"
                value={verbsInput}
                onChange={(e) => setVerbsInput(e.target.value)}
                placeholder="analyze, formulate, solve"
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
