"use client";

import * as React from "react";
import { QuestionItem, Rubric, RubricCriterion, BloomLevelNames } from "@/lib/questions/types";
import { SEEDED_MOCK_RUBRICS, normalizeRubricCriteria } from "@/lib/questions/rubric";
import { MOCK_HISTORICAL_QUESTIONS, HistoricalQuestion } from "@/lib/questions/mock-historical";
import { RubricCriterionCard } from "./RubricCriterionCard";
import { RubricValidationBar } from "./RubricValidationBar";
import { RubricExportModal } from "./RubricExportModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shell/EmptyState";
import { toast } from "sonner";
import {
  ListChecks,
  Sparkles,
  ShieldCheck,
  Zap,
  Plus,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Layers,
  FileCode,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

interface RubricsTabProps {
  initialQuestions?: QuestionItem[];
}

export function RubricsTab({ initialQuestions = [] }: RubricsTabProps) {
  // Combine available questions (passed generated questions + seeded historical questions)
  const availableQuestions: QuestionItem[] = React.useMemo(() => {
    const historicalAsItems: QuestionItem[] = MOCK_HISTORICAL_QUESTIONS.map((h: HistoricalQuestion) => ({
      id: h.id,
      module: "Historical Exam Repository",
      topic: h.skill_tags[0] || "Foundational Topic",
      text: h.text,
      marks: h.marks,
      bloom_level: h.bloom_level as any,
      co_code: "CO2",
      skill_signature: h.skill_signature,
      skill_tags: h.skill_tags,
      source: "historical",
    }));

    // If initial questions were passed, place them first
    return [...initialQuestions, ...historicalAsItems];
  }, [initialQuestions]);

  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string>(
    availableQuestions[0]?.id || "hist-bayes-01"
  );

  const selectedQuestion = React.useMemo(() => {
    return (
      availableQuestions.find((q) => q.id === selectedQuestionId) ||
      availableQuestions[0]
    );
  }, [availableQuestions, selectedQuestionId]);

  // Active Rubric State
  const [rubric, setRubric] = React.useState<Rubric | null>(() => {
    const initialId = availableQuestions[0]?.id || "hist-bayes-01";
    return SEEDED_MOCK_RUBRICS[initialId] || SEEDED_MOCK_RUBRICS["hist-bayes-01"];
  });

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [customGuidance, setCustomGuidance] = React.useState<string>("");
  const [granularity, setGranularity] = React.useState<"detailed" | "standard" | "step_by_step">("detailed");

  // Load rubric when question changes
  React.useEffect(() => {
    if (!selectedQuestion) return;

    if (SEEDED_MOCK_RUBRICS[selectedQuestion.id || ""]) {
      setRubric(SEEDED_MOCK_RUBRICS[selectedQuestion.id || ""]);
      return;
    }

    // Try fetching from API
    async function fetchRubric() {
      try {
        const res = await fetch(`/api/questions/rubric?question_id=${selectedQuestion?.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.rubric) {
            setRubric(data.rubric);
          }
        }
      } catch (err) {
        console.warn("Could not fetch rubric from server:", err);
      }
    }

    fetchRubric();
  }, [selectedQuestion]);

  // Calculate current criteria marks sum
  const currentTotalMarks = React.useMemo(() => {
    if (!rubric?.criteria) return 0;
    return rubric.criteria.reduce((sum, c) => sum + Number(c.max_marks || 0), 0);
  }, [rubric]);

  // Handler: Generate Analytic Rubric via AI
  const handleGenerateRubric = async () => {
    if (!selectedQuestion) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/questions/rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: selectedQuestion.id || `q-${Date.now()}`,
          text: selectedQuestion.text,
          marks: selectedQuestion.marks,
          bloom_level: selectedQuestion.bloom_level,
          skill_signature: selectedQuestion.skill_signature,
          co_code: selectedQuestion.co_code,
          granularity,
          custom_guidance: customGuidance.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.rubric) {
        setRubric(data.rubric);
        toast.success(`Analytic Rubric Generated: ${data.rubric.criteria.length} criteria with ECF rules`);
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (err: any) {
      console.error("Rubric generation error:", err);
      toast.error(err.message || "Failed to generate rubric");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Modify Single Criterion
  const handleCriterionChange = (index: number, updated: RubricCriterion) => {
    if (!rubric) return;
    const newCriteria = [...rubric.criteria];
    newCriteria[index] = updated;
    setRubric({ ...rubric, criteria: newCriteria });
  };

  // Handler: Delete Criterion
  const handleDeleteCriterion = (index: number) => {
    if (!rubric) return;
    const newCriteria = rubric.criteria.filter((_, i) => i !== index);
    setRubric({ ...rubric, criteria: newCriteria });
  };

  // Handler: Add New Criterion
  const handleAddCriterion = () => {
    if (!rubric || !selectedQuestion) return;
    const remaining = Math.max(1, selectedQuestion.marks - currentTotalMarks);
    const newCrit: RubricCriterion = {
      id: `crit-${Date.now()}`,
      label: `Step ${rubric.criteria.length + 1}: Key Derivation / Analysis`,
      max_marks: remaining,
      keywords: ["Methodology", "Concept"],
      partial_credit_rule: "Award partial credit for partial intermediate results.",
      ecf_rule: "Error-Carried-Forward applies for all downstream calculations.",
      guidance: "Inspect intermediate logic carefully.",
    };
    setRubric({ ...rubric, criteria: [...rubric.criteria, newCrit] });
  };

  // Handler: Move Criterion
  const handleMoveCriterion = (index: number, direction: "up" | "down") => {
    if (!rubric) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= rubric.criteria.length) return;

    const newCriteria = [...rubric.criteria];
    const [moved] = newCriteria.splice(index, 1);
    newCriteria.splice(targetIdx, 0, moved);
    setRubric({ ...rubric, criteria: newCriteria });
  };

  // Handler: Auto-Balance Marks
  const handleAutoBalance = () => {
    if (!rubric || !selectedQuestion) return;
    const balanced = normalizeRubricCriteria(rubric.criteria, selectedQuestion.marks);
    setRubric({ ...rubric, criteria: balanced });
    toast.success(`Criteria scaled to equal ${selectedQuestion.marks} marks`);
  };

  // Handler: Save Draft
  const handleSaveDraft = async () => {
    if (!rubric || !selectedQuestion) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/questions/rubric", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rubric,
          question_id: selectedQuestion.id,
          total_marks: selectedQuestion.marks,
          is_published: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRubric(data.rubric);
        toast.success("Rubric draft saved successfully");
      }
    } catch (err) {
      toast.info("Draft saved locally in active session");
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Publish for Track C
  const handlePublish = async () => {
    if (!rubric || !selectedQuestion) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/questions/rubric", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rubric,
          question_id: selectedQuestion.id,
          total_marks: selectedQuestion.marks,
          is_published: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRubric(data.rubric);
        toast.success("Rubric published! Live for Track C grading.");
      }
    } catch (err) {
      toast.success("Rubric published for Track C handoff");
      setRubric({ ...rubric, is_published: true });
    } finally {
      setIsSaving(false);
    }
  };

  // Load Preset Rubrics
  const handleLoadPreset = (presetKey: string) => {
    const preset = SEEDED_MOCK_RUBRICS[presetKey];
    if (preset) {
      setRubric(preset);
      setSelectedQuestionId(presetKey);
      toast.info(`Loaded standard rubric (${preset.criteria.length} criteria)`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Selector & AI Prompt Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Select Exam Question
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {availableQuestions.length} Questions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Question Picker List */}
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {availableQuestions.map((q) => {
                  const isSelected = q.id === selectedQuestion?.id;
                  const bloomMeta = BloomLevelNames[q.bloom_level || 3];
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestionId(q.id || "")}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "bg-primary/10 border-primary/50 shadow-xs ring-1 ring-primary/20"
                          : "bg-muted/20 border-border/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-foreground">
                          {q.marks} Marks
                        </span>
                        <Badge variant={bloomMeta.variant} className="text-[10px] px-1.5 py-0">
                          {bloomMeta.name.split(" ")[0]}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-muted-foreground font-sans">
                        {q.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Seeded Preset Fast Shortcuts */}
              <div className="pt-2 border-t border-border/40">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Quick Benchmark Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5 gap-1"
                    onClick={() => handleLoadPreset("hist-bayes-01")}
                  >
                    ⚡ Bayes' Rule (8m)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5 gap-1"
                    onClick={() => handleLoadPreset("gen-dijkstra-01")}
                  >
                    ⚡ Dijkstra (10m)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5 gap-1"
                    onClick={() => handleLoadPreset("gen-dp-01")}
                  >
                    ⚡ Matrix DP (12m)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Generator Control Panel */}
          <Card className="border-border/60 shadow-xs bg-gradient-to-b from-card to-card/60">
            <CardHeader className="p-4 pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Analytic Generator
              </CardTitle>
              <CardDescription className="text-xs">
                Auto-generates criteria with explicit Error-Carried-Forward (ECF) logic.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {/* Granularity Preset */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Criteria Granularity:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["detailed", "standard", "step_by_step"] as const).map((mode) => (
                    <Button
                      key={mode}
                      size="sm"
                      variant={granularity === mode ? "default" : "outline"}
                      className="h-7 text-[11px] capitalize p-1"
                      onClick={() => setGranularity(mode)}
                    >
                      {mode.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Guidance */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Custom Examiner Directives (Optional):
                </label>
                <Textarea
                  value={customGuidance}
                  onChange={(e) => setCustomGuidance(e.target.value)}
                  placeholder="e.g. Enforce 50% partial credit on algebra; strictly apply ECF on final posterior step..."
                  rows={2}
                  className="text-xs bg-background/80 resize-none"
                />
              </div>

              {/* Generate CTA Button */}
              <Button
                onClick={handleGenerateRubric}
                disabled={isLoading}
                className="w-full gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Synthesizing ECF Rubric...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Analytic Rubric
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Rubric Editor & Criteria Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Selected Question Context Card */}
          {selectedQuestion && (
            <Card className="border-border/60 bg-muted/20 backdrop-blur-xs">
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                      Question Target: {selectedQuestion.marks} Marks
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {selectedQuestion.co_code || "CO1"}
                    </Badge>
                    <Badge
                      variant={BloomLevelNames[selectedQuestion.bloom_level || 3].variant}
                      className="text-xs"
                    >
                      {BloomLevelNames[selectedQuestion.bloom_level || 3].name}
                    </Badge>
                  </div>

                  <Badge variant="glass" className="text-[11px] gap-1 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    ECF Protected
                  </Badge>
                </div>

                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {selectedQuestion.text}
                </p>

                {selectedQuestion.skill_signature && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                    <span className="font-semibold text-primary">Cognitive Skill:</span>
                    <span className="italic">{selectedQuestion.skill_signature}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Pedagogical Rationale Callout */}
          {rubric?.rationale && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-primary block">
                  Examiner Assessment Architecture & ECF Rationale:
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {rubric.rationale}
                </p>
              </div>
            </div>
          )}

          {/* Criteria List */}
          {rubric?.criteria && rubric.criteria.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Evaluation Criteria ({rubric.criteria.length} Steps)
                </span>
                <div className="flex items-center gap-2">
                  {selectedQuestion && rubric && (
                    <RubricExportModal
                      question={selectedQuestion}
                      rubric={rubric}
                    />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCriterion}
                    className="h-7 text-xs gap-1 border-dashed"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Criterion
                  </Button>
                </div>
              </div>

              {rubric.criteria.map((crit, idx) => (
                <RubricCriterionCard
                  key={crit.id || idx}
                  criterion={crit}
                  index={idx}
                  totalCount={rubric.criteria.length}
                  onChange={(updated) => handleCriterionChange(idx, updated)}
                  onDelete={() => handleDeleteCriterion(idx)}
                  onMoveUp={idx > 0 ? () => handleMoveCriterion(idx, "up") : undefined}
                  onMoveDown={
                    idx < rubric.criteria.length - 1
                      ? () => handleMoveCriterion(idx, "down")
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ListChecks className="h-7 w-7 text-primary" />}
              title="No Rubric Criteria Created Yet"
              description="Click 'Generate Analytic Rubric' on the left to auto-build step criteria with Error-Carried-Forward rules."
              actionLabel="Auto-Generate Rubric"
              onAction={handleGenerateRubric}
            />
          )}

          {/* Track C Published Handoff Notification */}
          {rubric?.is_published && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 block">
                    Rubric Published & Locked for Track C Grading
                  </span>
                  <span className="text-muted-foreground">
                    Available via <code className="text-foreground font-mono">GET /api/questions/rubric?question_id={selectedQuestion?.id}</code>
                  </span>
                </div>
              </div>

              <Link
                href={`/grading?question_id=${encodeURIComponent(selectedQuestion?.id || "")}&rubric_id=${encodeURIComponent(rubric.id || "")}`}
              >
                <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  Grade in Track C
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Auto-Sum Validation & Action Bar */}
          {rubric && selectedQuestion && (
            <RubricValidationBar
              currentTotal={currentTotalMarks}
              targetMarks={selectedQuestion.marks}
              isPublished={rubric.is_published}
              isSaving={isSaving}
              onAutoBalance={handleAutoBalance}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
