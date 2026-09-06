import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  FileQuestion,
  Scale,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Brain,
  ShieldCheck,
  TrendingUp,
  Cpu,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, code, title")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let designComplete = false;
  let authorComplete = false;
  let gradeComplete = false;
  if (course) {
    const [outcomes, blueprints, questions, rubrics, scripts, grades] = await Promise.all([
      supabase.from("course_outcomes").select("id", { count: "exact", head: true }).eq("course_id", course.id),
      supabase.from("blueprints").select("id", { count: "exact", head: true }).eq("course_id", course.id),
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("course_id", course.id),
      supabase.from("rubrics").select("id, questions!inner(course_id)", { count: "exact", head: true }).eq("questions.course_id", course.id),
      supabase.from("exam_scripts").select("id", { count: "exact", head: true }).eq("course_id", course.id),
      supabase.from("grades").select("id, exam_scripts!inner(course_id)", { count: "exact", head: true }).eq("exam_scripts.course_id", course.id),
    ]);
    designComplete = Boolean(outcomes.count && blueprints.count);
    authorComplete = Boolean(questions.count && rubrics.count);
    gradeComplete = Boolean(scripts.count && grades.count);
  }

  const progress = [designComplete, authorComplete, gradeComplete];
  const lifecycleStages = [
    {
      id: "track-a",
      title: "1. Course Design & Blueprint",
      subtitle: "Track A — Outcome-Based Education",
      description:
        "Transform syllabus into measurable Bloom's Course Outcomes, construct the sparse CO–PO correlation matrix, and generate an outcome-drift-aware exam blueprint.",
      href: "/design",
      icon: Compass,
      badgeText: "OBE & RAG",
      badgeVariant: "default" as const,
      differentiator: "⭐ Drift-Aware: Reweight exam by what was actually taught vs planned",
      features: [
        "Syllabus to Bloom's Outcomes (Levels 1–6)",
        "Interactive CO–PO Heatmap Matrix",
        "RAG Lecture Ingestion with pgvector",
        "Outcome-Drift topic reweighting",
      ],
      cta: "Launch Course Design",
      complete: designComplete,
    },
    {
      id: "track-b",
      title: "2. Question Paper & Rubrics",
      subtitle: "Track B — Authoring & Dedup Engine",
      description:
        "Generate blueprint-constrained question papers with cognitive balance ratios, run triple-layer deduplication against past exams, and generate partial-credit rubrics.",
      href: "/questions",
      icon: FileQuestion,
      badgeText: "Dedup & Rubrics",
      badgeVariant: "warning" as const,
      differentiator: "⭐ Skill-Signature Dedup: Catches same skill in different disguise",
      features: [
        "Blueprint-constrained question generation",
        "Triple-layer dedup (Cosine + Jaccard + Skill)",
        "Cognitive ratio balance indicator",
        "Analytic rubrics with ECF (Error-Carried-Forward)",
      ],
      cta: "Launch Question Authoring",
      complete: authorComplete,
    },
    {
      id: "track-c",
      title: "3. Grading, Blind & Reliability",
      subtitle: "Track C — Evaluation & Fairness",
      description:
        "Multimodal AI grading of handwritten student scripts, double-blind two-examiner workflows with discrepancy arbitration, and reliability analytics (Cohen's Kappa).",
      href: "/grading",
      icon: Scale,
      badgeText: "VLM & Double-Blind",
      badgeVariant: "success" as const,
      differentiator: "⭐ Disagreement Classifier & Confidence-Per-Region HITL",
      features: [
        "Image-native multimodal grading (No OCR)",
        "Confidence-per-region surgical review",
        "Double-blind E1/E2 Δ-arbitration",
        "Cohen's Kappa & Examiner bias calibration",
      ],
      cta: "Launch Grading & Fairness",
      complete: gradeComplete,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <PageHeader
        title="Faculty Academic Lifecycle"
        description="IAPEA end-to-end co-pilot: Design outcome-aligned curriculum, author balanced and deduped exams, and grade student scripts with verifiable fairness."
        badgeText="Integrated Lifecycle Active"
        badgeVariant="success"
        icon={<Brain className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/api/health/ai" target="_blank" rel="noopener noreferrer">
                <Cpu className="mr-1.5 h-3.5 w-3.5 text-primary" />
                AI Health Status
              </a>
            </Button>
          </div>
        }
      />

      <section className="reveal delay-1 flex flex-col gap-4 border-y border-border/60 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 hover:scale-105"><CalendarDays className="h-5 w-5" /></span>
          <div><p className="text-sm font-semibold">Conflict-safe course routine</p><p className="text-xs text-muted-foreground">Assign weekly sessions only when the instructor, room, and cohort are all available.</p></div>
        </div>
        <Button asChild variant="outline" className="press group"><Link href="/routine">Open Routine <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></Button>
      </section>

      <section className="reveal delay-2 border-y border-border/60 py-5" aria-label="Lifecycle progress">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{course ? `${course.code}: ${course.title}` : "No active course yet"}</p>
            <p className="text-xs text-muted-foreground">{progress.filter(Boolean).length} of 3 lifecycle stages complete</p>
          </div>
          <div className="flex min-w-0 flex-1 items-center sm:max-w-xl">
            {lifecycleStages.map((stage, index) => (
              <React.Fragment key={stage.id}>
                <Link href={stage.href} className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${stage.complete ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background text-muted-foreground"}`}>
                    {stage.complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="max-w-24 truncate text-[11px] text-muted-foreground">{stage.subtitle.split(" — ")[0]}</span>
                </Link>
                {index < lifecycleStages.length - 1 && <span className={`mb-5 h-0.5 flex-1 ${stage.complete ? "bg-emerald-500" : "bg-border"}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Hero Banner with Soft Depth */}
      <div className="reveal-blur delay-3 relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-indigo-500/5 p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl pointer-events-none animate-float" />
        <div className="absolute -left-16 -bottom-10 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl pointer-events-none animate-float-rev" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5 animate-glow-pulse" />
            Human-in-the-Loop Architecture
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="text-foreground">From Raw Syllabus to </span>
            <span className="text-gradient-brand">Fairly Graded Exams</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            IAPEA replaces academic cognitive fatigue with intelligent automation while keeping university faculty in complete editorial control at every step.
          </p>

          <div className="stagger-children grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="hover-lift rounded-xl border border-border/60 bg-background/50 p-3 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground">OBE Outcomes</div>
              <div className="text-lg font-bold text-foreground">Bloom 1–6</div>
            </div>
            <div className="hover-lift rounded-xl border border-border/60 bg-background/50 p-3 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground">Dedup Engine</div>
              <div className="text-lg font-bold text-foreground">3 Layers</div>
            </div>
            <div className="hover-lift rounded-xl border border-border/60 bg-background/50 p-3 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground">Grading Vision</div>
              <div className="text-lg font-bold text-foreground">Image-Native</div>
            </div>
            <div className="hover-lift rounded-xl border border-border/60 bg-background/50 p-3 backdrop-blur-sm">
              <div className="text-xs text-muted-foreground">Fairness Target</div>
              <div className="text-lg font-bold text-foreground">κ ≥ 0.85</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Lifecycle Cards */}
      <div className="stagger-children grid grid-cols-1 md:grid-cols-3 gap-6">
        {lifecycleStages.map((stage) => (
          <Card
            key={stage.id}
            className="hover-lift group flex flex-col justify-between rounded-2xl border border-border/80 bg-card hover:border-primary/50"
          >
            <div>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                    <stage.icon className="h-6 w-6" />
                  </div>
                  <Badge variant={stage.badgeVariant} className="text-xs">
                    {stage.complete ? "Completed" : stage.badgeText}
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {stage.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {stage.subtitle}
                  </p>
                </div>
                <CardDescription className="text-xs leading-relaxed pt-1">
                  {stage.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Differentiator Banner */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  {stage.differentiator}
                </div>

                {/* Features checklist */}
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {stage.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </div>

            <CardFooter className="pt-2">
              <Button asChild className="w-full gap-2 rounded-xl press group/btn">
                <Link href={stage.href}>
                  {stage.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
