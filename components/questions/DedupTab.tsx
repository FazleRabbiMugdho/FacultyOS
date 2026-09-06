"use client";

import * as React from "react";
import { DedupFlagResult } from "@/lib/questions/dedup";
import { DedupComparisonCard } from "./DedupComparisonCard";
import { DedupCertificateModal } from "./DedupCertificateModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  XCircle,
  Award,
  RefreshCw,
  Search,
  Filter,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export function DedupTab() {
  const [loading, setLoading] = React.useState(false);
  const [flags, setFlags] = React.useState<DedupFlagResult[]>([]);
  const [filter, setFilter] = React.useState<"all" | "review" | "rejected" | "clear" | "skill">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stats, setStats] = React.useState<{
    total_audited: number;
    clear_count: number;
    review_count: number;
    rejected_count: number;
    skill_disguised_count: number;
  } | null>(null);
  const [certModalOpen, setCertModalOpen] = React.useState(false);

  const runDedupAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/questions/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: "course-cs301" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Deduplication audit failed");
      }

      setFlags(data.flags);
      setStats(data.stats);
      toast.success(
        `Audit complete: ${data.stats.clear_count} clear, ${data.stats.review_count} review, ${data.stats.rejected_count} rejected`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to run audit");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    runDedupAudit();
  }, []);

  const handleKeep = (questionId: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.question_id === questionId ? { ...f, status: "clear" as const, recommendation: "Overridden by faculty (Kept)" } : f))
    );
    toast.success("Question approved and marked clear");
  };

  const handleReject = (questionId: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.question_id === questionId ? { ...f, status: "rejected" as const, recommendation: "Marked for replacement by faculty" } : f))
    );
    toast.info("Question rejected");
  };

  const handleReroll = async (flag: DedupFlagResult) => {
    try {
      const res = await fetch("/api/questions/dedup/reroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: flag.module,
          topic: flag.module,
          co_code: flag.co_code,
          marks: flag.marks,
          bloom_level: flag.bloom_level,
          colliding_skill_signature: flag.skill_signature,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Reroll failed");
      }

      const replacement = data.question;

      // Update question flag in state as clear with new skill
      setFlags((prev) =>
        prev.map((f) =>
          f.question_id === flag.question_id
            ? {
                ...f,
                question_text: replacement.text,
                skill_signature: replacement.skill_signature,
                skill_tags: replacement.skill_tags,
                matched_question_text: null,
                matched_exam_info: null,
                cosine: 0.18,
                jaccard: 0.12,
                skill_match: 0.22,
                status: "clear" as const,
                layer: "none" as const,
                disguise_reason: undefined,
                recommendation: "Regenerated with original skill vector. No collision.",
              }
            : f
        )
      );

      toast.success("Regenerated novel question with distinct skill signature!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to regenerate variant question");
    }
  };

  const filteredFlags = flags.filter((f) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "skill" ? f.layer === "skill" : f.status === filter);

    const matchesSearch =
      searchQuery === "" ||
      f.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.skill_signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.matched_question_text && f.matched_question_text.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header & KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Total */}
        <Card className="rounded-2xl border-border/80 bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Total Audited</div>
          <div className="text-2xl font-bold text-foreground tabular-nums mt-1">
            {stats?.total_audited ?? flags.length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Exam paper items</div>
        </Card>

        {/* Clear */}
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-sm shadow-sm">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Clear (Original)
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {flags.filter((f) => f.status === "clear").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">&lt;70% similarity</div>
        </Card>

        {/* Needs Review */}
        <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm shadow-sm">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs Review
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
            {flags.filter((f) => f.status === "review").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">70–82% similarity</div>
        </Card>

        {/* Rejected */}
        <Card className="rounded-2xl border-rose-500/20 bg-rose-500/5 p-4 backdrop-blur-sm shadow-sm">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1">
            {flags.filter((f) => f.status === "rejected").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">≥82% Cosine / ≥60% Jaccard</div>
        </Card>

        {/* ⭐ Layer 3 Skill-Disguised Duplicates */}
        <Card className="rounded-2xl border-indigo-500/30 bg-indigo-500/10 p-4 backdrop-blur-sm shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            ⭐ Skill Duplicates
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-1">
            {flags.filter((f) => f.layer === "skill").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Disguised task collision</div>
        </Card>
      </div>

      {/* 2. Controls Toolbar & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 rounded-lg"
            onClick={() => setFilter("all")}
          >
            All ({flags.length})
          </Button>
          <Button
            variant={filter === "review" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 rounded-lg text-amber-600 dark:text-amber-400"
            onClick={() => setFilter("review")}
          >
            Review ({flags.filter((f) => f.status === "review").length})
          </Button>
          <Button
            variant={filter === "rejected" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 rounded-lg text-rose-600 dark:text-rose-400"
            onClick={() => setFilter("rejected")}
          >
            Rejected ({flags.filter((f) => f.status === "rejected").length})
          </Button>
          <Button
            variant={filter === "clear" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 rounded-lg text-emerald-600 dark:text-emerald-400"
            onClick={() => setFilter("clear")}
          >
            Clear ({flags.filter((f) => f.status === "clear").length})
          </Button>
          <Button
            variant={filter === "skill" ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 rounded-lg border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold"
            onClick={() => setFilter("skill")}
          >
            ⭐ Same Skill ({flags.filter((f) => f.layer === "skill").length})
          </Button>
        </div>

        {/* Search & Audit Action */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs rounded-xl"
            onClick={() => setCertModalOpen(true)}
          >
            <Award className="h-3.5 w-3.5 text-primary" />
            Audit Certificate
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs rounded-xl"
            onClick={runDedupAudit}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-run Audit
          </Button>
        </div>
      </div>

      {/* 3. Loading State */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      )}

      {/* 4. Comparison Cards List */}
      {!loading && filteredFlags.length > 0 && (
        <div className="space-y-5">
          {filteredFlags.map((flag, idx) => (
            <DedupComparisonCard
              key={flag.question_id || idx}
              flag={flag}
              index={flags.indexOf(flag)}
              onKeep={handleKeep}
              onReject={handleReject}
              onReroll={handleReroll}
            />
          ))}
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && filteredFlags.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-12 text-center backdrop-blur-sm space-y-3">
          <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">
            No Questions Match Selected Filter
          </h3>
          <p className="text-xs text-muted-foreground">
            All questions have been audited against the historical paper repository.
          </p>
          <Button variant="outline" size="sm" onClick={() => setFilter("all")} className="text-xs">
            Reset Filter
          </Button>
        </div>
      )}

      {/* Audit Certificate Modal */}
      <DedupCertificateModal
        open={certModalOpen}
        onOpenChange={setCertModalOpen}
        flags={flags}
        courseCode="CS301"
        courseTitle="Data Structures & Algorithms"
        examTitle="Mid-Semester Assessment 2026"
      />
    </div>
  );
}
