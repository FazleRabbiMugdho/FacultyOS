"use client";

import * as React from "react";
import {
  type Course,
  type Blueprint,
  type BlueprintTopic,
  type DocumentRecord,
} from "@/lib/design/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Upload,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ArrowRight,
  Database,
  Calendar,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface BlueprintTabProps {
  course: Course;
}

const MODULE_COLORS = [
  "bg-blue-500 text-blue-500",
  "bg-indigo-500 text-indigo-500",
  "bg-purple-500 text-purple-500",
  "bg-amber-500 text-amber-500",
  "bg-rose-500 text-rose-500",
  "bg-emerald-500 text-emerald-500",
];

export function BlueprintTab({ course }: BlueprintTabProps) {
  const [blueprint, setBlueprint] = React.useState<Blueprint | null>(null);
  const [topics, setTopics] = React.useState<BlueprintTopic[]>([]);
  const [documents, setDocuments] = React.useState<DocumentRecord[]>([]);
  const [totalChunks, setTotalChunks] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [seedingDocs, setSeedingDocs] = React.useState(false);
  const [mode, setMode] = React.useState<"planned" | "drift_aware">("drift_aware");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);

  // Manual Document Upload Form
  const [docType, setDocType] = React.useState<"slides" | "past_paper">("slides");
  const [docContent, setDocContent] = React.useState("");
  const [docPlannedDate, setDocPlannedDate] = React.useState("2026-09-01");
  const [docTaughtDate, setDocTaughtDate] = React.useState("2026-09-02");
  const [isSkipped, setIsSkipped] = React.useState(false);
  const [uploadingDoc, setUploadingDoc] = React.useState(false);

  // Load Blueprint & Ingested Docs
  const fetchBlueprintData = React.useCallback(async () => {
    if (!course?.id) return;
    setLoading(true);
    try {
      const [bpRes, docRes] = await Promise.all([
        fetch(`/api/design/blueprint?course_id=${course.id}`),
        fetch(`/api/design/ingest?course_id=${course.id}`),
      ]);

      const bpData = await bpRes.json();
      const docData = await docRes.json();

      if (bpRes.ok && bpData) {
        setBlueprint(bpData.blueprint || null);
        setTopics(bpData.topics || []);
        setTotalChunks(bpData.total_chunks || 0);
      }

      if (docRes.ok && docData.documents) {
        setDocuments(docData.documents || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load blueprint");
    } finally {
      setLoading(false);
    }
  }, [course?.id]);

  React.useEffect(() => {
    fetchBlueprintData();
  }, [fetchBlueprintData]);

  // AI Blueprint Synthesis
  const handleGenerateBlueprint = async (selectedMode = mode) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/design/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: course.id,
          mode: selectedMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate exam blueprint");
      }

      setBlueprint(data.blueprint);
      setTopics(data.topics || []);
      toast.success(
        `Generated ${selectedMode === "drift_aware" ? "Drift-Aware" : "Standard"} Exam Blueprint!`,
        {
          description: `Weights normalized to 100% across ${data.topics.length} topics.`,
        }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "AI Blueprint generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Seed Demo Lecture Corpus
  const handleSeedDemoCorpus = async () => {
    setSeedingDocs(true);
    try {
      const res = await fetch("/api/design/seed-demo-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: course.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to seed demo corpus");
      }

      toast.success("Seeded 3 realistic lecture documents with pgvector embeddings!");
      await fetchBlueprintData();
      // Auto generate drift-aware blueprint
      await handleGenerateBlueprint("drift_aware");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to seed demo corpus");
    } finally {
      setSeedingDocs(false);
    }
  };

  // Manual Document Ingestion
  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docContent.trim()) {
      toast.error("Please enter document content");
      return;
    }

    setUploadingDoc(true);
    try {
      const res = await fetch("/api/design/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: course.id,
          type: docType,
          content: docContent.trim(),
          planned_at: docPlannedDate,
          taught_at: isSkipped ? null : docTaughtDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to ingest document");
      }

      toast.success(`Ingested & embedded document (${data.chunks_embedded} chunks)!`);
      setDocContent("");
      setIsUploadOpen(false);
      await fetchBlueprintData();
    } catch (err: any) {
      toast.error(err.message || "Failed to ingest document");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Inline Topic Weight Edit with live re-normalization
  const handleUpdateTopicWeight = async (topicId: string, newWeight: number) => {
    try {
      const res = await fetch("/api/design/blueprint/topic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: topicId,
          weight_percent: newWeight,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update weight");
      }

      setTopics(data.topics || []);
      toast.success("Topic weight updated & blueprint re-normalized to 100%");
    } catch (err: any) {
      toast.error(err.message || "Failed to update topic weight");
    }
  };

  const totalWeight = topics.reduce(
    (sum, t) => sum + (Number(t.weight_percent) || 0),
    0
  );
  const roundedTotal = Math.round(totalWeight * 10) / 10;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 animate-fade-in">
        {/* 1. RAG Materials & Ingestion Header */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Database className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  RAG Document Corpus & Lecture Ingestion (pgvector)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Ingested course slides, past papers, and syllabi are embedded (768-dim) and tracked by delivery dates for drift synthesis.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDemoCorpus}
                disabled={seedingDocs || generating}
                className="rounded-xl text-xs gap-1.5"
              >
                {seedingDocs ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
                Seed Demo Lecture Corpus
              </Button>

              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" className="rounded-xl text-xs gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    Ingest Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/80 glass-panel">
                  <form onSubmit={handleIngestDocument}>
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">
                        Ingest Lecture Material
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Embed notes/slides into pgvector and record delivery schedule for drift detection.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Document Type</Label>
                          <Select
                            value={docType}
                            onValueChange={(v: any) => setDocType(v)}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="slides">Lecture Slides</SelectItem>
                              <SelectItem value="past_paper">Past Exam Paper</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Planned Date</Label>
                          <Input
                            type="date"
                            value={docPlannedDate}
                            onChange={(e) => setDocPlannedDate(e.target.value)}
                            className="rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Delivery Status</Label>
                          <label className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSkipped}
                              onChange={(e) => setIsSkipped(e.target.checked)}
                              className="rounded"
                            />
                            Mark as Rushed/Skipped (Untaught)
                          </label>
                        </div>
                        {!isSkipped && (
                          <div className="space-y-1 pt-1">
                            <Label className="text-[11px] text-muted-foreground">
                              Actual Date Taught in Class
                            </Label>
                            <Input
                              type="date"
                              value={docTaughtDate}
                              onChange={(e) => setDocTaughtDate(e.target.value)}
                              className="rounded-xl text-xs"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Content Text</Label>
                        <Textarea
                          rows={4}
                          placeholder="Paste lecture text, key definitions, formulas, or slide points..."
                          value={docContent}
                          onChange={(e) => setDocContent(e.target.value)}
                          className="rounded-xl text-xs"
                          required
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsUploadOpen(false)}
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={uploadingDoc}
                        className="rounded-xl gap-2"
                      >
                        {uploadingDoc ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Embedding...
                          </>
                        ) : (
                          "Ingest & Embed"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Ingested Document Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Ingested Corpus ({documents.length} Documents · {totalChunks} pgvector chunks)</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchBlueprintData}
                className="h-6 px-2 text-[11px] gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                No auxiliary lecture documents ingested yet. Click{" "}
                <strong className="text-primary font-semibold cursor-pointer" onClick={handleSeedDemoCorpus}>
                  "Seed Demo Lecture Corpus"
                </strong>{" "}
                to populate realistic slide embeddings.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {documents.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3 text-xs space-y-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {doc.type}
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {doc.chunk_count || 1} chunks
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground font-medium line-clamp-2 pt-0.5">
                        {doc.extracted_text?.slice(0, 100)}...
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-1.5 text-[10px]">
                      <span className="text-muted-foreground">
                        {doc.planned_at ? `Plan: ${new Date(doc.planned_at).toLocaleDateString()}` : "No date"}
                      </span>
                      {doc.taught_at ? (
                        <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Taught
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-semibold">
                          <AlertTriangle className="h-3 w-3 mr-0.5" /> Skipped / Rushed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Weighting Mode Toggle & Differentiator Callout */}
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-card to-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                ⭐ Differentiator
              </span>
              <h4 className="text-sm font-bold text-foreground">
                Outcome-Drift-Aware Exam Weighting
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dynamically reweights the exam by instructional coverage volume. Topics skipped or rushed in lectures are down-weighted to protect student fairness.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Weighting Mode Buttons */}
            <div className="inline-flex rounded-xl bg-muted p-1 border border-border/60">
              <button
                type="button"
                onClick={() => {
                  setMode("planned");
                  handleGenerateBlueprint("planned");
                }}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                  mode === "planned"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Planned Syllabus
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("drift_aware");
                  handleGenerateBlueprint("drift_aware");
                }}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-all flex items-center gap-1",
                  mode === "drift_aware"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="h-3 w-3" />
                Actually Taught (Drift-Aware)
              </button>
            </div>

            <Button
              size="sm"
              onClick={() => handleGenerateBlueprint(mode)}
              disabled={generating}
              className="rounded-xl text-xs gap-1.5 shadow-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {topics.length > 0 ? "Re-Synthesize" : "Synthesize Blueprint"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 3. Horizontal Weighted Distribution Bar */}
        {topics.length > 0 && (
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">Exam Mark Weight Distribution</span>
                <span className="text-muted-foreground">({mode === "drift_aware" ? "Drift-Aware Mode" : "Planned Mode"})</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums">
                <span>Total:</span>
                <span
                  className={cn(
                    roundedTotal === 100
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-500"
                  )}
                >
                  {roundedTotal}%
                </span>
                {roundedTotal === 100 && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 inline" />
                )}
              </div>
            </div>

            {/* Segmented Bar */}
            <div className="flex h-4 w-full overflow-hidden rounded-xl bg-muted/60 p-0.5 border border-border/50">
              {topics.map((t, idx) => {
                const colorClass = MODULE_COLORS[idx % MODULE_COLORS.length].split(" ")[0];
                return (
                  <Tooltip key={t.id || idx}>
                    <TooltipTrigger asChild>
                      <div
                        style={{ width: `${Math.max(t.weight_percent, 2)}%` }}
                        className={cn(
                          "h-full transition-all duration-300 first:rounded-l-lg last:rounded-r-lg opacity-90 hover:opacity-100 hover:brightness-110",
                          colorClass
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <strong>{t.module}</strong>: {t.topic} ({t.weight_percent}%)
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Bar Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {topics.map((t, idx) => {
                const colorBg = MODULE_COLORS[idx % MODULE_COLORS.length].split(" ")[0];
                return (
                  <div key={t.id || idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={cn("h-2.5 w-2.5 rounded-full", colorBg)} />
                    <span className="font-medium text-foreground">{t.module}:</span>
                    <span className="font-mono tabular-nums font-semibold">{t.weight_percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Exam Blueprint Topics Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Exam Blueprint & Cognitive Allocation
                </h3>
                {topics.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ✨ Ready for Question Generation (Track B Contract)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Edit weight percentages to auto-renormalize. Track B will read this blueprint to generate questions.
              </p>
            </div>

            {topics.length > 0 && (
              <Button asChild size="sm" className="rounded-xl text-xs gap-1.5 shadow-sm">
                <Link
                  href={`/questions?course_id=${encodeURIComponent(course.id)}&blueprint_id=${encodeURIComponent(blueprint?.id || topics[0]?.blueprint_id || "")}`}
                >
                  Generate Questions with this Blueprint
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-2xl border border-border/70 bg-card">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading exam blueprint...</p>
            </div>
          ) : topics.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-bold text-foreground">
                  No Exam Blueprint Generated Yet
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click below to synthesize a drift-aware exam blueprint that balances planned syllabus weights with actually delivered lecture materials.
                </p>
              </div>
              <Button
                onClick={() => handleGenerateBlueprint("drift_aware")}
                disabled={generating}
                className="rounded-xl text-xs gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Synthesize Blueprint with AI
              </Button>
            </div>
          ) : (
            <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-bold text-muted-foreground">
                      <th className="py-3.5 px-4 min-w-[200px]">Module & Topic</th>
                      <th className="py-3.5 px-3 text-center font-mono">Planned %</th>
                      <th className="py-3.5 px-3 text-center font-mono">Actual %</th>
                      <th className="py-3.5 px-3 text-center min-w-[150px]">Outcome Drift (Δ)</th>
                      <th className="py-3.5 px-4 text-center min-w-[120px]">Exam Weight %</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Reasoning Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {topics.map((t) => {
                      const driftVal = Number(t.drift) || 0;
                      return (
                        <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                          {/* Module and Topic */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground">{t.module}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{t.topic}</div>
                          </td>

                          {/* Planned % */}
                          <td className="py-3.5 px-3 text-center font-mono tabular-nums text-muted-foreground">
                            {t.planned_weight ?? "—"}%
                          </td>

                          {/* Actual % */}
                          <td className="py-3.5 px-3 text-center font-mono tabular-nums text-foreground font-semibold">
                            {t.actual_weight ?? "—"}%
                          </td>

                          {/* Outcome Drift with visual arrows and explanation */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              {driftVal > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <TrendingUp className="h-3 w-3" /> +{driftVal}%
                                </span>
                              )}
                              {driftVal < 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-help">
                                      <TrendingDown className="h-3 w-3" /> {driftVal}%
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs">
                                    <strong className="text-rose-500 block mb-0.5">Rushed / Skipped in Class</strong>
                                    {t.drift_explanation || "Instructional volume was lower than planned schedule — down-weighted to protect student fairness."}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {driftVal === 0 && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground border border-border/50">
                                  <Minus className="h-3 w-3" /> 0%
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Exam Weight % Input */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                defaultValue={t.weight_percent}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (val !== t.weight_percent) {
                                    handleUpdateTopicWeight(t.id, val);
                                  }
                                }}
                                className="h-8 w-16 text-center font-mono text-xs font-bold rounded-lg border-border/80 tabular-nums"
                              />
                              <span className="font-mono text-xs text-muted-foreground font-semibold">
                                %
                              </span>
                            </div>
                          </td>

                          {/* Reasoning Note */}
                          <td className="py-3.5 px-4 text-[11px] text-muted-foreground">
                            {t.drift_explanation || (
                              driftVal < 0
                                ? "Down-weighted due to compressed lecture coverage."
                                : driftVal > 0
                                ? "Expanded due to deep slide delivery."
                                : "Balanced on-schedule delivery."
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Row */}
                    <tr className="bg-muted/30 font-bold border-t-2 border-border/80 text-xs">
                      <td className="py-3.5 px-4 text-foreground">
                        Total Blueprint Mark Distribution
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-muted-foreground">
                        100%
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-foreground">
                        100%
                      </td>
                      <td className="py-3.5 px-3 text-center text-muted-foreground text-[11px]">
                        Net Balance: 0%
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono tabular-nums text-primary font-bold text-sm">
                        {roundedTotal}%
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-emerald-600 dark:text-emerald-400">
                        {roundedTotal === 100 ? "✓ 100% Validated Blueprint" : "! Adjustment needed"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
