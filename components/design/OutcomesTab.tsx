"use client";

import * as React from "react";
import { type Course, type CourseOutcome, type BloomLevel, BLOOM_TAXONOMY } from "@/lib/design/types";
import { OutcomeCard } from "./OutcomeCard";
import { BloomBadge } from "./BloomBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Upload,
  FileText,
  Plus,
  RefreshCw,
  Layers,
  Brain,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface OutcomesTabProps {
  course: Course;
}

const SAMPLE_SYLLABUS = `Course: CS301 — Advanced Algorithms & Complexity
Credit Hours: 3.0 | Level: Senior Undergraduate

Module 1: Asymptotic Analysis & Recurrences
- Master Theorem, Akra-Bazzi method, recursion trees
- Amortized analysis: Aggregate, Accounting, and Potential methods (dynamic arrays, splay trees)

Module 2: Advanced Design Paradigms
- Dynamic Programming on Trees and Bitmasking (TSP, Vertex Cover on trees)
- Greedy strategies and Matroid theory (Kruskal, Prim correctness proofs)
- Network Flows: Ford-Fulkerson, Edmonds-Karp, Max-Flow Min-Cut theorem, Bipartite matching

Module 3: Randomized Algorithms & Probabilistic Analysis
- Las Vegas vs Monte Carlo algorithms
- Randomized Quicksort, Skip Lists, Bloom Filters, Chernoff Bounds

Module 4: Intractability & Approximation
- P vs NP, NP-Completeness proofs via polynomial-time reductions (3-SAT, Clique, Vertex Cover)
- Constant-factor approximation algorithms (TSP Metric 2-approx, Knapsack FPTAS)`;

export function OutcomesTab({ course }: OutcomesTabProps) {
  const [outcomes, setOutcomes] = React.useState<CourseOutcome[]>([]);
  const [performance, setPerformance] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [syllabusText, setSyllabusText] = React.useState("");
  const [isManualDialogOpen, setIsManualDialogOpen] = React.useState(false);

  // Manual outcome form state
  const [manualCode, setManualCode] = React.useState("");
  const [manualStatement, setManualStatement] = React.useState("");
  const [manualBloom, setManualBloom] = React.useState<BloomLevel>(3);
  const [manualVerbs, setManualVerbs] = React.useState("");
  const [manualSaving, setManualSaving] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch existing outcomes for this course
  const fetchOutcomes = React.useCallback(async () => {
    if (!course?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/design/outcomes?course_id=${course.id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch outcomes");
      }
      setOutcomes(data.outcomes || []);
      const feedbackRes = await fetch(`/api/design/co-feedback?course_id=${course.id}`, { method: "POST" });
      if (feedbackRes.ok) {
        const feedback = await feedbackRes.json();
        setPerformance(Object.fromEntries((feedback.performance || []).map((item: any) => [item.co_id, item])));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load course outcomes");
    } finally {
      setLoading(false);
    }
  }, [course?.id]);

  React.useEffect(() => {
    fetchOutcomes();
  }, [fetchOutcomes]);

  // Handle AI generation
  const handleGenerateOutcomes = async () => {
    if (!syllabusText.trim()) {
      toast.error("Please paste or upload a syllabus first");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/design/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: course.id,
          syllabus_text: syllabusText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate outcomes");
      }

      setOutcomes(data.outcomes || []);
      toast.success(
        `Successfully generated and saved ${data.count || data.outcomes.length} Course Outcomes with Bloom alignment!`,
        {
          description: data.source === "fallback"
            ? "Offline fallback used because Gemini was unavailable. Results remain editable."
            : "Measurable OBE competencies are now active.",
        }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate outcomes via AI");
    } finally {
      setGenerating(false);
    }
  };

  // Handle PDF/File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("course_id", course.id);

    try {
      const res = await fetch("/api/design/syllabus-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to extract syllabus");
      }

      if (data.extractedText) {
        setSyllabusText(data.extractedText);
        toast.success(`Extracted text from "${file.name}"`);
      } else {
        toast.info(`Uploaded "${file.name}" to course documents`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process syllabus file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle manual outcome addition
  const handleAddManualOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStatement.trim() || !manualCode.trim()) {
      toast.error("Please provide both code and statement");
      return;
    }

    setManualSaving(true);
    try {
      const verbs = manualVerbs
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch("/api/design/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_manual: true,
          course_id: course.id,
          code: manualCode.trim().toUpperCase(),
          statement: manualStatement.trim(),
          bloom_level: manualBloom,
          action_verbs: verbs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add outcome");
      }

      setOutcomes((prev) => [...prev, data.outcome]);
      toast.success(`Outcome ${data.outcome.code} added`);
      setManualCode("");
      setManualStatement("");
      setManualVerbs("");
      setIsManualDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add outcome");
    } finally {
      setManualSaving(false);
    }
  };

  // Stats calculation
  const totalCOs = outcomes.length;
  const lowerOrderCount = outcomes.filter((o) => o.bloom_level <= 3).length;
  const higherOrderCount = outcomes.filter((o) => o.bloom_level >= 4).length;
  const hotPercentage =
    totalCOs > 0 ? Math.round((higherOrderCount / totalCOs) * 100) : 0;
  const lotPercentage =
    totalCOs > 0 ? Math.round((lowerOrderCount / totalCOs) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Syllabus Ingestion Panel */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5 mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Syllabus & Course Curriculum Ingestion
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste the module breakdown or upload course syllabus PDF to automatically synthesize Bloom-aligned Course Outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSyllabusText(SAMPLE_SYLLABUS)}
              className="text-xs rounded-xl gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Fill Sample Syllabus
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.md"
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs rounded-xl gap-1.5"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload PDF
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="syllabus" className="text-xs font-semibold flex items-center justify-between">
              <span>Syllabus Content</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {syllabusText.length} characters
              </span>
            </Label>
            <Textarea
              id="syllabus"
              rows={6}
              placeholder="Paste raw syllabus outline, lecture modules, prerequisites, or topics here..."
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              className="rounded-2xl font-mono text-xs leading-relaxed resize-y bg-background/60"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="inline-flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-1.5 border border-primary/20 text-xs text-muted-foreground">
              <Brain className="h-4 w-4 text-primary shrink-0" />
              <span>
                Gemini 1.5 Pro extracts 4–8 measurable COs with verified Bloom levels (1–6) & action verbs.
              </span>
            </div>

            <Button
              onClick={handleGenerateOutcomes}
              disabled={generating || !syllabusText.trim()}
              className="rounded-xl gap-2 min-w-[200px] shadow-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Outcomes...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Course Outcomes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Cognitive Balance & Summary Statistics */}
      {outcomes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium">
              Total Course Outcomes
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totalCOs} COs
            </div>
            <div className="text-[11px] text-muted-foreground">
              Accreditation aligned
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Lower-Order (LOT L1–L3)</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {lotPercentage}%
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {lowerOrderCount} / {totalCOs}
            </div>
            <Progress value={lotPercentage} className="h-1.5 mt-2 bg-emerald-500/20" />
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Higher-Order (HOT L4–L6)</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400 tabular-nums">
                {hotPercentage}%
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {higherOrderCount} / {totalCOs}
            </div>
            <Progress value={hotPercentage} className="h-1.5 mt-2 bg-purple-500/20" />
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-medium">
                Cognitive Health Ratio
              </div>
              <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                {hotPercentage >= 40 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Rigorous & Balanced</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Heavy Lower-Order</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Target: ≥40% Higher-Order (L4–L6)
            </div>
          </div>
        </div>
      )}

      {/* 3. Outcomes Display & Actions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight">
                Active Course Outcomes ({course.code})
              </h3>
              {outcomes.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Generated · Schema Validated
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Each outcome is bound to an exact Bloom cognitive tier and verifiable action verbs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOutcomes}
              className="rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>

            {/* Manual Add Outcome Dialog */}
            <Dialog
              open={isManualDialogOpen}
              onOpenChange={setIsManualDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="rounded-xl text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Outcome
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-2xl border-border/80 glass-panel">
                <form onSubmit={handleAddManualOutcome}>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                      Add Custom Course Outcome
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Manually specify an outcome with Revised Bloom's Taxonomy level.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1 col-span-1">
                        <Label htmlFor="m-code" className="text-xs font-semibold">
                          Code
                        </Label>
                        <Input
                          id="m-code"
                          placeholder={`CO${outcomes.length + 1}`}
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                          className="rounded-xl font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label htmlFor="m-bloom" className="text-xs font-semibold">
                          Bloom Level
                        </Label>
                        <Select
                          value={String(manualBloom)}
                          onValueChange={(val) => setManualBloom(Number(val) as BloomLevel)}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {[1, 2, 3, 4, 5, 6].map((lvl) => {
                              const item = BLOOM_TAXONOMY[lvl as BloomLevel];
                              return (
                                <SelectItem key={lvl} value={String(lvl)} className="rounded-lg">
                                  Level {lvl}: {item.name} ({item.category})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="m-statement" className="text-xs font-semibold">
                        Measurable Statement
                      </Label>
                      <Textarea
                        id="m-statement"
                        rows={3}
                        placeholder="Apply graph theoretical models to solve real-world routing problems..."
                        value={manualStatement}
                        onChange={(e) => setManualStatement(e.target.value)}
                        className="rounded-xl resize-none text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="m-verbs" className="text-xs font-semibold">
                        Action Verbs (comma separated)
                      </Label>
                      <Input
                        id="m-verbs"
                        placeholder="apply, solve, compute"
                        value={manualVerbs}
                        onChange={(e) => setManualVerbs(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsManualDialogOpen(false)}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={manualSaving}
                      className="rounded-xl gap-2"
                    >
                      {manualSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Outcome"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Loading / Generating Skeletons */}
        {(loading || generating) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-16 rounded-lg" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !generating && outcomes.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-7 w-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="text-base font-bold text-foreground">
                No Course Outcomes generated yet
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paste your syllabus in the panel above and click{" "}
                <span className="font-semibold text-primary">"Generate Course Outcomes"</span>{" "}
                to extract 4–8 measurable Bloom's taxonomy objectives.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSyllabusText(SAMPLE_SYLLABUS);
                toast.info("Sample syllabus filled! Click 'Generate Course Outcomes'");
              }}
              className="rounded-xl text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Try with Sample Syllabus
            </Button>
          </div>
        )}

        {/* Outcome Cards Grid */}
        {!loading && !generating && outcomes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outcomes.map((outcome) => (
              <OutcomeCard
                key={outcome.id}
                outcome={outcome}
                performance={performance[outcome.id]}
                onUpdate={(updated) => {
                  setOutcomes((prev) =>
                    prev.map((o) => (o.id === updated.id ? updated : o))
                  );
                }}
                onDelete={(id) => {
                  setOutcomes((prev) => prev.filter((o) => o.id !== id));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
