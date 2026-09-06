"use client";

import * as React from "react";
import {
  type Course,
  type CourseOutcome,
  type ProgramOutcome,
  type CoPoMapping,
} from "@/lib/design/types";
import { BloomBadge } from "./BloomBadge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  RefreshCw,
  Info,
  Grid,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CoPoMatrixProps {
  course: Course;
}

export function CoPoMatrix({ course }: CoPoMatrixProps) {
  const [courseOutcomes, setCourseOutcomes] = React.useState<CourseOutcome[]>([]);
  const [programOutcomes, setProgramOutcomes] = React.useState<ProgramOutcome[]>([]);
  // Map keyed by "co_id:po_id" => weight (1 | 2 | 3)
  const [cellWeights, setCellWeights] = React.useState<Map<string, number>>(
    new Map()
  );
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);

  // Fetch Matrix Data
  const fetchMatrixData = React.useCallback(async () => {
    if (!course?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/design/co-po?course_id=${course.id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch CO-PO matrix");
      }

      setCourseOutcomes(data.course_outcomes || []);
      setProgramOutcomes(data.program_outcomes || []);

      const newMap = new Map<string, number>();
      if (data.mappings && Array.isArray(data.mappings)) {
        for (const m of data.mappings) {
          newMap.set(`${m.co_id}:${m.po_id}`, m.weight);
        }
      }
      setCellWeights(newMap);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load CO-PO matrix");
    } finally {
      setLoading(false);
    }
  }, [course?.id]);

  React.useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  // AI Generation
  const handleGenerateAI = async () => {
    if (courseOutcomes.length === 0) {
      toast.error("No Course Outcomes available. Please generate COs in Tab 1 first.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/design/co-po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: course.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate CO-PO mappings");
      }

      const newMap = new Map<string, number>();
      if (data.mappings && Array.isArray(data.mappings)) {
        for (const m of data.mappings) {
          newMap.set(`${m.co_id}:${m.po_id}`, m.weight);
        }
      }
      setCellWeights(newMap);

      toast.success(
        `Generated sparse CO–PO matrix (${data.mapped_cells} correlations, ${data.sparsity_percent}% sparsity)!`,
        {
          description: "ABET-compliant non-dense mapping established.",
        }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "AI CO-PO generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Optimistic click cell cycle: 0 -> 1 -> 2 -> 3 -> 0
  const handleCellClick = async (coId: string, poId: string) => {
    const key = `${coId}:${poId}`;
    const currentWeight = cellWeights.get(key) || 0;
    const nextWeight = (currentWeight + 1) % 4; // 0 -> 1 -> 2 -> 3 -> 0

    // Optimistic state update
    setCellWeights((prev) => {
      const updated = new Map(prev);
      if (nextWeight === 0) {
        updated.delete(key);
      } else {
        updated.set(key, nextWeight);
      }
      return updated;
    });

    try {
      const res = await fetch("/api/design/co-po", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          co_id: coId,
          po_id: poId,
          weight: nextWeight,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to persist cell weight");
      }
    } catch (err: any) {
      // Revert optimistic update
      setCellWeights((prev) => {
        const reverted = new Map(prev);
        if (currentWeight === 0) {
          reverted.delete(key);
        } else {
          reverted.set(key, currentWeight);
        }
        return reverted;
      });
      toast.error(err.message || "Failed to save cell weight");
    }
  };

  // Clear all mappings
  const handleClearMatrix = async () => {
    if (cellWeights.size === 0) return;
    const previous = new Map(cellWeights);
    setCellWeights(new Map());

    try {
      // Clear mappings sequentially or via reset
      const coIds = courseOutcomes.map((c) => c.id);
      for (const coId of coIds) {
        for (const po of programOutcomes) {
          if (previous.has(`${coId}:${po.id}`)) {
            await fetch("/api/design/co-po", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ co_id: coId, po_id: po.id, weight: 0 }),
            });
          }
        }
      }
      toast.info("Matrix cleared");
    } catch (err) {
      setCellWeights(previous);
      toast.error("Failed to reset matrix");
    }
  };

  // Computed metrics
  const totalCells = courseOutcomes.length * programOutcomes.length;
  const mappedCells = cellWeights.size;
  const sparsityPercent =
    totalCells > 0
      ? Math.round(((totalCells - mappedCells) / totalCells) * 100)
      : 100;

  // Compute PO column averages
  const poAverages = React.useMemo(() => {
    const avgs: Record<string, { sum: number; count: number; avg: number }> = {};
    for (const po of programOutcomes) {
      let sum = 0;
      let count = 0;
      for (const co of courseOutcomes) {
        const w = cellWeights.get(`${co.id}:${po.id}`) || 0;
        if (w > 0) {
          sum += w;
          count++;
        }
      }
      avgs[po.id] = {
        sum,
        count,
        avg: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
      };
    }
    return avgs;
  }, [courseOutcomes, programOutcomes, cellWeights]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 animate-fade-in">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Grid className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                CO–PO Correlation Matrix & Attainment Mapping
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Map Course Outcomes (COs) to ABET Program Outcomes (POs) on a 1–3 correlation scale. Click any cell to cycle weights (0 → 1 → 2 → 3 → 0).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMatrixData}
              disabled={loading || generating}
              className="rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>

            {cellWeights.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearMatrix}
                disabled={loading || generating}
                className="rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-rose-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleGenerateAI}
              disabled={generating || courseOutcomes.length === 0}
              className="rounded-xl text-xs gap-2 shadow-sm min-w-[170px]"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating Matrix...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {cellWeights.size > 0 ? "Regenerate AI Matrix" : "Auto-Map Matrix with AI"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Matrix Health & Sparsity Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium">
              Matrix Sparsity Index
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {sparsityPercent}%
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                  sparsityPercent >= 60 && sparsityPercent <= 90
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                )}
              >
                {sparsityPercent >= 60 && sparsityPercent <= 90 ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ABET Compliant (Sparse)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {sparsityPercent < 60 ? "Overly Dense" : "Ultra Sparse"}
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ideal range: 65% – 85% unmapped cells
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium">
              Active Correlations
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {mappedCells} / {totalCells} Cells
            </div>
            <p className="text-[11px] text-muted-foreground">
              {courseOutcomes.length} COs × {programOutcomes.length} POs
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-medium">
                Self-Correcting Loop Standby
              </div>
              <div className="text-xs font-semibold text-primary flex items-center gap-1">
                <span>Wave 2 Feedback Active</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Post-grading analysis will correlate student exam failures to weak mapping vs poor teaching.
            </p>
          </div>
        </div>

        {/* Heatmap Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-2xl border border-border/70 bg-card">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading CO–PO correlation matrix...</p>
          </div>
        ) : courseOutcomes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Info className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              No Course Outcomes Available
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Please switch to the <strong>1. Outcomes</strong> tab and generate or add Course Outcomes for {course.code} first.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse select-none">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-bold text-muted-foreground">
                    <th className="py-3.5 px-4 min-w-[220px] font-semibold sticky left-0 bg-card/95 backdrop-blur-sm z-10">
                      Course Outcome (CO)
                    </th>
                    {programOutcomes.map((po) => (
                      <th
                        key={po.id}
                        className="py-3.5 px-2 text-center font-mono tracking-wider min-w-[48px]"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold text-foreground hover:bg-muted transition-colors">
                              {po.code}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs font-normal">
                            <strong className="font-bold text-primary block mb-0.5">
                              {po.code}
                            </strong>
                            {po.description}
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {courseOutcomes.map((co) => (
                    <tr
                      key={co.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Left sticky column with CO Code and Statement */}
                      <td className="py-3 px-4 sticky left-0 bg-card/95 backdrop-blur-sm z-10 border-r border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary shrink-0">
                            {co.code}
                          </span>
                          <BloomBadge level={co.bloom_level} size="sm" showName={false} />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[200px] mt-1 cursor-help">
                              {co.statement}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm text-xs">
                            <strong className="font-semibold text-primary block mb-0.5">
                              {co.code} (Bloom L{co.bloom_level})
                            </strong>
                            {co.statement}
                          </TooltipContent>
                        </Tooltip>
                      </td>

                      {/* PO Weight Cells */}
                      {programOutcomes.map((po) => {
                        const weight = cellWeights.get(`${co.id}:${po.id}`) || 0;
                        return (
                          <td
                            key={po.id}
                            className="p-1.5 text-center align-middle"
                          >
                            <button
                              type="button"
                              onClick={() => handleCellClick(co.id, po.id)}
                              className={cn(
                                "h-9 w-9 mx-auto rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all duration-150 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40",
                                weight === 0 &&
                                  "text-muted-foreground/30 hover:bg-muted/60 hover:text-muted-foreground border border-transparent",
                                weight === 1 &&
                                  "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 shadow-xs",
                                weight === 2 &&
                                  "bg-primary/40 text-primary border border-primary/60 hover:bg-primary/50 shadow-xs",
                                weight === 3 &&
                                  "bg-primary text-primary-foreground border border-primary hover:brightness-110 shadow-sm"
                              )}
                              title={`Click to cycle weight: ${weight} -> ${(weight + 1) % 4}`}
                            >
                              {weight === 0 ? "·" : weight}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Column Averages Row */}
                  <tr className="bg-muted/30 font-semibold border-t-2 border-border/80 text-[11px]">
                    <td className="py-3 px-4 sticky left-0 bg-card/95 backdrop-blur-sm z-10 border-r border-border/40 text-muted-foreground">
                      Average PO Weight
                    </td>
                    {programOutcomes.map((po) => {
                      const stats = poAverages[po.id];
                      return (
                        <td
                          key={po.id}
                          className="p-2 text-center font-mono tabular-nums text-foreground font-bold"
                        >
                          {stats?.count ? stats.avg : "—"}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Matrix Footer Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/20 p-4 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-foreground text-[11px]">
                  Heatmap Legend:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-lg border border-border/70 flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                    ·
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    0: No Correlation
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-lg bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-[10px] font-bold font-mono">
                    1
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    1: Low (Recall/Foundational)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-lg bg-primary/40 text-primary border border-primary/60 flex items-center justify-center text-[10px] font-bold font-mono">
                    2
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    2: Medium (Application)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold font-mono">
                    3
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    3: High (Analysis/Design)
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground font-medium">
                Tip: Click any cell to cycle weights
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
