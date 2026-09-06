"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ImageUp, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GradingQuestion } from "./types";

interface AiGradeTabProps { questions: GradingQuestion[]; onComplete: () => void; }

export function AiGradeTab({ questions, onComplete }: AiGradeTabProps) {
  const [questionId, setQuestionId] = React.useState(questions[0]?.id ?? "");
  const [maskedId, setMaskedId] = React.useState(`STU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState("");
  const [result, setResult] = React.useState<any>(null);
  const [overrideScore, setOverrideScore] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const question = questions.find((item) => item.id === questionId);
  const rubric = question?.rubrics?.[0];

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    if (next) setPreview(URL.createObjectURL(next));
  }

  async function grade() {
    if (!file || !question || !rubric) return toast.error("Select a published rubric and script image");
    setLoading(true);
    try {
      const encoded = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/grading/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: question.course_id, question_id: question.id, student_masked_id: maskedId, image_base64: encoded, mime_type: file.type, rubric: rubric.criteria }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      setOverrideScore(Number(data.grade.score));
      toast.success("Script graded and anonymized");
      onComplete();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Grading failed"); }
    finally { setLoading(false); }
  }

  async function override() {
    const response = await fetch("/api/grading/ai", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grade_id: result.grade.id, score: overrideScore, rubric_selections: result.grade.rubric_selections }) });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    toast.success("Human override saved");
    onComplete();
  }

  if (!questions.length) return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No published questions or rubrics yet. Track B must publish one before live grading.</div>;

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><Label>Question and rubric</Label><Select value={questionId} onValueChange={setQuestionId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{questions.filter((item) => item.rubrics?.length).map((item) => <SelectItem key={item.id} value={item.id}>{item.text.slice(0, 62)}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Masked student ID</Label><Input value={maskedId} onChange={(event) => setMaskedId(event.target.value)} /></div>
      </div>
      <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
        <ImageUp className="mb-3 h-7 w-7 text-primary" /><span className="text-sm font-medium">Upload handwritten answer</span><span className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or WebP</span><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} className="sr-only" />
      </label>
      {preview && <img src={preview} alt="Anonymized script preview" className="max-h-[520px] w-full rounded-xl border object-contain bg-white" />}
      <Button onClick={grade} disabled={loading || !file || !rubric} className="w-full"><ScanLine className="mr-2 h-4 w-4" />{loading ? "Evaluating script..." : "Grade image against rubric"}</Button>
    </div>
    <Card className="h-fit"><CardHeader><CardTitle className="flex items-center justify-between text-base">AI assessment {result?.grade?.confidence != null && <Badge variant={result.needs_manual_review ? "warning" : "success"}>{Math.round(result.grade.confidence * 100)}% confidence</Badge>}</CardTitle></CardHeader><CardContent className="space-y-4">
      {!result && <p className="text-sm text-muted-foreground">Criterion scores and exact low-confidence regions will appear here.</p>}
      {result?.needs_manual_review && <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0" />Review only the highlighted regions below.</div>}
      {result?.grade?.rubric_selections?.map((item: any) => <div key={item.label} className="border-b pb-3 last:border-0"><div className="flex justify-between text-sm font-medium"><span>{item.label}</span><span>{item.awarded}/{item.max_marks}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.reason}</p></div>)}
      {result?.grade && <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3"><span className="font-medium">Total score</span><span className="text-xl font-semibold tabular-nums">{result.grade.score}/{rubric?.total_marks}</span></div>}
      {result?.grade && <div className="grid grid-cols-[1fr_auto] gap-2"><Input aria-label="Human override score" type="number" min={0} max={rubric?.total_marks} value={overrideScore} onChange={(event) => setOverrideScore(Number(event.target.value))} /><Button variant="outline" onClick={override}>Accept / override</Button></div>}
      {result?.grade?.region_confidences?.map((region: any) => <div key={region.region_label} className="space-y-1.5"><div className="flex justify-between text-xs"><span className="flex items-center gap-1">{region.confidence >= .85 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}{region.region_label}</span><span>{Math.round(region.confidence * 100)}%</span></div><Progress value={region.confidence * 100} /><p className="text-xs text-muted-foreground">{region.note}</p></div>)}
    </CardContent></Card>
  </div>;
}
