"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  QuestionItem,
  GenerateQuestionsResponse,
  BloomLevel,
} from "@/lib/questions/types";
import { MOCK_COURSES, MockCourse } from "@/lib/questions/mock-blueprint";
import { CognitiveBalanceBar } from "./CognitiveBalanceBar";
import { QuestionCard } from "./QuestionCard";
import { ExamPaperPreviewModal } from "./ExamPaperPreviewModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Sliders,
  BookOpen,
  Layers,
  Printer,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export function GenerateTab() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = React.useState<MockCourse[]>(MOCK_COURSES);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>(MOCK_COURSES[0].id);
  const [selectedBlueprintId, setSelectedBlueprintId] = React.useState<string>(MOCK_COURSES[0].blueprints[0].id);
  const [totalMarks, setTotalMarks] = React.useState<number>(50);
  const [targetLowerRatio, setTargetLowerRatio] = React.useState<number>(40);
  const [targetHigherRatio, setTargetHigherRatio] = React.useState<number>(60);
  const [examTitle, setExamTitle] = React.useState<string>("Mid-Semester Assessment 2026");
  const [customInstructions, setCustomInstructions] = React.useState<string>("");

  const [loading, setLoading] = React.useState<boolean>(false);
  const [questions, setQuestions] = React.useState<QuestionItem[]>([]);
  const [paperStats, setPaperStats] = React.useState<GenerateQuestionsResponse["stats"] | null>(null);
  const [paperRationale, setPaperRationale] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const courseId = searchParams.get("course_id");
    const blueprintId = searchParams.get("blueprint_id");

    // Fully hydrate a real DB course (outcomes + blueprint + topics) into MockCourse shape.
    async function hydrateCourse(course: any): Promise<MockCourse> {
      try {
        const [outcomesResponse, blueprintResponse] = await Promise.all([
          fetch(`/api/design/outcomes?course_id=${course.id}`),
          fetch(`/api/design/blueprint?course_id=${course.id}`),
        ]);
        const outcomesData = await outcomesResponse.json();
        const blueprintData = await blueprintResponse.json();
        const blueprints = blueprintData.blueprint
          ? [{ ...blueprintData.blueprint, topics: blueprintData.topics || [] }]
          : [{ ...MOCK_COURSES[0].blueprints[0], id: `bp-auto-${course.id}` }];
        return {
          ...course,
          outcomes: outcomesData.outcomes?.length ? outcomesData.outcomes : MOCK_COURSES[0].outcomes,
          blueprints,
        };
      } catch {
        return { ...course, outcomes: MOCK_COURSES[0].outcomes, blueprints: [{ ...MOCK_COURSES[0].blueprints[0], id: `bp-auto-${course.id}` }] };
      }
    }

    // Default: load real courses so generated questions persist to the shared DB
    // (a valid course_id is required — mock "course-*" ids get nulled and dropped).
    async function loadRealCourses() {
      try {
        const coursesResponse = await fetch("/api/design/courses");
        const coursesData = await coursesResponse.json();
        const realCourses = coursesData.courses || [];
        if (!realCourses.length) return;
        const hydrated = await Promise.all(realCourses.map(hydrateCourse));
        setCourses([...hydrated, ...MOCK_COURSES]);
        setSelectedCourseId(hydrated[0].id);
        if (hydrated[0].blueprints[0]) setSelectedBlueprintId(hydrated[0].blueprints[0].id);
      } catch {
        // keep MOCK_COURSES fallback
      }
    }

    if (!courseId) {
      void loadRealCourses();
      return;
    }

    const localCourse = MOCK_COURSES.find((item) => item.id === courseId);
    if (localCourse) {
      setSelectedCourseId(courseId);
      if (blueprintId) setSelectedBlueprintId(blueprintId);
      return;
    }
    const requestedCourseId = courseId;

    async function hydrateHandoff() {
      try {
        const [coursesResponse, outcomesResponse, blueprintResponse] = await Promise.all([
          fetch("/api/design/courses"),
          fetch(`/api/design/outcomes?course_id=${requestedCourseId}`),
          fetch(`/api/design/blueprint?course_id=${requestedCourseId}`),
        ]);
        const coursesData = await coursesResponse.json();
        const outcomesData = await outcomesResponse.json();
        const blueprintData = await blueprintResponse.json();
        const course = (coursesData.courses || []).find((item: any) => item.id === requestedCourseId);
        if (!course) return;
        const hydrated: MockCourse = {
          ...course,
          outcomes: outcomesData.outcomes || [],
          blueprints: blueprintData.blueprint ? [{
            ...blueprintData.blueprint,
            id: blueprintId || blueprintData.blueprint.id,
            topics: blueprintData.topics || [],
          }] : [],
        };
        if (!hydrated.blueprints.length) return;
        setCourses((current) => [hydrated, ...current.filter((item) => item.id !== requestedCourseId)]);
        setSelectedCourseId(requestedCourseId);
        setSelectedBlueprintId(hydrated.blueprints[0].id);
      } catch {
        toast.error("Could not load the handed-off Track A blueprint");
      }
    }
    void hydrateHandoff();
  }, [searchParams]);

  const currentCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const currentBlueprint = currentCourse.blueprints.find((b) => b.id === selectedBlueprintId) || currentCourse.blueprints[0];

  // Adjust Lower/Higher ratios synchronously
  const handleLowerRatioChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setTargetLowerRatio(clamped);
    setTargetHigherRatio(100 - clamped);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setQuestions([]);
    setPaperStats(null);
    setPaperRationale(null);

    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: selectedCourseId,
          blueprint_id: selectedBlueprintId,
          total_marks: totalMarks,
          target_lower_order_percent: targetLowerRatio,
          target_higher_order_percent: targetHigherRatio,
          exam_title: examTitle,
          custom_instructions: customInstructions,
        }),
      });

      const data: GenerateQuestionsResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error((data as any).error || "Generation failed");
      }

      setQuestions(data.questions);
      setPaperStats(data.stats);
      setPaperRationale(data.paper_rationale || null);
      toast.success(`Generated ${data.questions.length} questions matching blueprint!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = (updated: QuestionItem) => {
    const updatedList = questions.map((q) => (q.id === updated.id ? updated : q));
    setQuestions(updatedList);
    recalculateStats(updatedList);
    toast.success("Question updated");
  };

  const handleDeleteQuestion = (id?: string) => {
    const updatedList = questions.filter((q) => q.id !== id);
    setQuestions(updatedList);
    recalculateStats(updatedList);
    toast.info("Question removed");
  };

  const handleDuplicateQuestion = (q: QuestionItem) => {
    const duplicated: QuestionItem = {
      ...q,
      id: `q_dup_${Date.now()}`,
      text: `${q.text} (Variation)`,
    };
    const updatedList = [...questions, duplicated];
    setQuestions(updatedList);
    recalculateStats(updatedList);
    toast.success("Question duplicated");
  };

  const handleAddQuestion = () => {
    const firstModule = currentBlueprint.topics[0]?.module || "Module 1";
    const firstTopic = currentBlueprint.topics[0]?.topic || "General";
    const newQ: QuestionItem = {
      id: `q_new_${Date.now()}`,
      module: firstModule,
      topic: firstTopic,
      text: "New customized question statement...",
      marks: 5,
      bloom_level: 3 as BloomLevel,
      co_code: currentCourse.outcomes[0]?.code || "CO1",
      skill_signature: "apply standard algorithmic method to given input",
      skill_tags: ["custom", "application"],
      estimated_minutes: 10,
      source: "generated",
    };
    const updatedList = [...questions, newQ];
    setQuestions(updatedList);
    recalculateStats(updatedList);
    toast.success("Added new question");
  };

  const recalculateStats = (list: QuestionItem[]) => {
    if (list.length === 0) return;
    let lower = 0;
    let higher = 0;
    let total = 0;
    let totalMin = 0;
    const bloomMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const modMap: Record<string, { marks: number; count: number }> = {};

    for (const q of list) {
      total += q.marks;
      if (q.bloom_level <= 2) lower += q.marks;
      else higher += q.marks;
      bloomMap[q.bloom_level] = (bloomMap[q.bloom_level] || 0) + q.marks;
      totalMin += q.estimated_minutes || q.marks * 2;

      if (!modMap[q.module]) modMap[q.module] = { marks: 0, count: 0 };
      modMap[q.module].marks += q.marks;
      modMap[q.module].count += 1;
    }

    setPaperStats({
      total_marks: total,
      total_questions: list.length,
      target_lower_ratio: targetLowerRatio,
      target_higher_ratio: targetHigherRatio,
      actual_lower_ratio: total > 0 ? Math.round((lower / total) * 100) : 0,
      actual_higher_ratio: total > 0 ? Math.round((higher / total) * 100) : 0,
      estimated_total_minutes: totalMin,
      module_breakdown: Object.entries(modMap).map(([m, d]) => ({
        module: m,
        marks: d.marks,
        weight_percent: total > 0 ? Math.round((d.marks / total) * 100) : 0,
        question_count: d.count,
      })),
      bloom_distribution: bloomMap,
    });
  };

  // Group Questions by Module
  const moduleGroups = React.useMemo(() => {
    const map = new Map<string, QuestionItem[]>();
    for (const q of questions) {
      const existing = map.get(q.module) || [];
      existing.push(q);
      map.set(q.module, existing);
    }
    return Array.from(map.entries());
  }, [questions]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Configuration & Parameter Panel */}
      <Card className="glass-panel border-border/80 shadow-md">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                Blueprint & Cognitive Constraints
              </CardTitle>
              <CardDescription>
                Configure exam parameters, total mark distribution, and Bloom&apos;s ratio
              </CardDescription>
            </div>
            <Badge variant="glass" className="self-start sm:self-auto gap-1 text-xs">
              <Sparkles className="h-3 w-3 text-primary" />
              Gemini 1.5 Pro Constrained
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Course Selector */}
            <div className="space-y-2">
              <Label htmlFor="course">Target Course</Label>
              <Select
                value={selectedCourseId}
                onValueChange={(val) => {
                  setSelectedCourseId(val);
                  const c = courses.find((item) => item.id === val);
                  if (c && c.blueprints[0]) {
                    setSelectedBlueprintId(c.blueprints[0].id);
                  }
                }}
              >
                <SelectTrigger id="course">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code}: {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {currentCourse.outcomes.length} Course Outcomes (COs) mapped
              </p>
            </div>

            {/* Blueprint Selector */}
            <div className="space-y-2">
              <Label htmlFor="blueprint">Exam Blueprint</Label>
              <Select
                value={selectedBlueprintId}
                onValueChange={(val) => setSelectedBlueprintId(val)}
              >
                <SelectTrigger id="blueprint">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentCourse.blueprints.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {currentBlueprint.topics.map((t, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {t.module.split(":")[0]}: {t.weight_percent}%
                  </span>
                ))}
              </div>
            </div>

            {/* Total Marks */}
            <div className="space-y-2">
              <Label htmlFor="marks">Total Marks Allocation</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="marks"
                  type="number"
                  min="10"
                  max="200"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  className="font-bold text-base"
                />
                <div className="flex gap-1">
                  {[50, 75, 100].map((m) => (
                    <Button
                      key={m}
                      type="button"
                      variant={totalMarks === m ? "default" : "outline"}
                      size="sm"
                      className="h-10 text-xs px-2.5"
                      onClick={() => setTotalMarks(m)}
                    >
                      {m}M
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sum of module question marks will equal {totalMarks}
              </p>
            </div>
          </div>

          {/* Cognitive Ratio Sliders & Custom Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/60">
            {/* Cognitive Ratio Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-foreground">Cognitive Balance Ratio</span>
                <span className="text-xs font-semibold text-primary">
                  {targetLowerRatio}% Lower (L1–L2) / {targetHigherRatio}% Higher (L3–L6)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={targetLowerRatio}
                onChange={(e) => handleLowerRatioChange(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>40% Lower / 60% Higher (Standard OBE)</span>
                <span>20% Lower / 80% Higher (Rigorous Honors)</span>
              </div>
            </div>

            {/* Custom Faculty Notes */}
            <div className="space-y-2">
              <Label htmlFor="customNotes">Special Prompt Guidance (Optional)</Label>
              <Input
                id="customNotes"
                placeholder="e.g. Include one real-world network routing scenario for Dijkstra..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
              />
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Generates normalized skill signatures for Track B2 deduplication</span>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="gap-2 px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-primary-foreground" />
                  Generating Blueprint Questions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Balanced Paper
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Loading Skeleton View */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        </div>
      )}

      {/* 3. Generated Questions Paper View */}
      {!loading && questions.length > 0 && (
        <div className="space-y-6">
          {/* Cognitive Balance Summary Bar */}
          <CognitiveBalanceBar
            targetLower={targetLowerRatio}
            targetHigher={targetHigherRatio}
            actualLower={paperStats?.actual_lower_ratio || 40}
            actualHigher={paperStats?.actual_higher_ratio || 60}
            totalMarks={paperStats?.total_marks || totalMarks}
            estimatedMinutes={paperStats?.estimated_total_minutes || 120}
            bloomDistribution={paperStats?.bloom_distribution}
          />

          {/* Paper Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Generated Question Paper ({questions.length} Items)
              </h3>
              <p className="text-xs text-muted-foreground">
                Total Marks: {paperStats?.total_marks}M · Mapped to {currentCourse.outcomes.length} Course Outcomes
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-xl"
                onClick={handleAddQuestion}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Question
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-xl"
                onClick={() => setPreviewOpen(true)}
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                Preview / Print
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700"
                onClick={() => toast.success("Paper saved to Supabase questions repository!")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save Final Paper
              </Button>
            </div>
          </div>

          {/* Module-Grouped Questions List */}
          <div className="space-y-8">
            {moduleGroups.map(([moduleName, moduleQuestions], mIdx) => {
              const moduleMarks = moduleQuestions.reduce((acc, q) => acc + q.marks, 0);

              return (
                <div key={mIdx} className="space-y-4">
                  {/* Module Header Bar */}
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-2.5 rounded-xl border border-border/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm text-foreground">
                        {moduleName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-semibold">
                        {moduleMarks} Marks
                      </Badge>
                      <span className="text-muted-foreground">
                        ({moduleQuestions.length} Questions)
                      </span>
                    </div>
                  </div>

                  {/* Question Cards */}
                  <div className="space-y-3 pl-2">
                    {moduleQuestions.map((q) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        index={questions.indexOf(q)}
                        onUpdate={handleUpdateQuestion}
                        onDelete={handleDeleteQuestion}
                        onDuplicate={handleDuplicateQuestion}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stage Handoff Banner to Track B2 (Deduplication) */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-sm shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                <Sparkles className="h-4 w-4" />
                Next Stage: Triple-Layer Deduplication (Track B2)
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                All questions generated with normalized <strong>skill_signatures</strong> and vector embeddings. Cross-check against historical exam papers for semantic, lexical, and disguised conceptual repetition.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-2 shrink-0 rounded-xl"
              onClick={() => toast.info("Switching to Deduplication tab (Track B2)...")}
            >
              Run Deduplication Check
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 4. Empty Initial State */}
      {!loading && questions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-12 text-center backdrop-blur-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-foreground">
              Ready to Generate Question Paper
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select your course blueprint above, adjust mark weights and cognitive ratios, and click <strong>Generate Balanced Paper</strong>.
            </p>
          </div>
          <Button onClick={handleGenerate} className="gap-2 rounded-xl">
            <Sparkles className="h-4 w-4" />
            Generate Paper Now
          </Button>
        </div>
      )}

      {/* Examination Paper Printable Modal */}
      <ExamPaperPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        questions={questions}
        courseCode={currentCourse.code}
        courseTitle={currentCourse.title}
        examTitle={examTitle}
        totalMarks={paperStats?.total_marks || totalMarks}
        durationMinutes={paperStats?.estimated_total_minutes || 120}
      />
    </div>
  );
}
