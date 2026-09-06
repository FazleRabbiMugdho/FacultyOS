"use client";

import * as React from "react";
import { Gavel, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExamScript, GradingQuestion } from "./types";

export function DoubleBlindTab({ scripts, questions, onComplete }: { scripts: ExamScript[]; questions: GradingQuestion[]; onComplete: () => void }) {
  const [scriptId, setScriptId] = React.useState(scripts[0]?.id ?? "");
  const [role, setRole] = React.useState<"E1" | "E2" | "E3">("E1");
  const [scores, setScores] = React.useState<number[]>([]);
  const [result, setResult] = React.useState<any>(null);
  const script = scripts.find((item) => item.id === scriptId);
  const question = questions.find((item) => item.id === script?.question_id);
  const rubric = question?.rubrics?.[0];
  React.useEffect(() => setScores((rubric?.criteria ?? []).map(() => 0)), [rubric?.id]);

  async function submit() {
    if (!script || !question || !rubric) return;
    const selections = rubric.criteria.map((item, index) => ({ label: item.label, awarded: scores[index] ?? 0, maxMarks: item.max_marks, ecfApplied: false }));
    const response = await fetch("/api/grading/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script_id: script.id, question_id: question.id, examiner_role: role, total_marks: rubric.total_marks, selections }) });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setResult(data); toast.success(data.waiting_for ? `Submitted blind; waiting for ${data.waiting_for}` : "Examiners reconciled"); onComplete();
  }

  if (!scripts.length) return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Upload and AI-grade a script first.</div>;
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Script</Label><Select value={scriptId} onValueChange={setScriptId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{scripts.map((item) => <SelectItem key={item.id} value={item.id}>{item.student_masked_id}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Demo examiner role</Label><Select value={role} onValueChange={(value: any) => { setRole(value); setResult(null); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="E1">Examiner 1</SelectItem><SelectItem value="E2">Examiner 2</SelectItem><SelectItem value="E3">Senior arbitrator</SelectItem></SelectContent></Select></div></div>
    <div className="grid gap-6 lg:grid-cols-2"><div className="flex min-h-80 items-center justify-center rounded-xl border bg-muted/20 p-8 text-center"><div><LockKeyhole className="mx-auto mb-3 h-7 w-7 text-primary" /><p className="font-medium">{script?.student_masked_id}</p><p className="mt-1 text-xs text-muted-foreground">Identity remains hidden during marking</p></div></div><div className="space-y-3">{rubric?.criteria.map((item, index) => <div key={item.label} className="grid grid-cols-[1fr_90px] items-center gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">Maximum {item.max_marks} marks</p></div><Input type="number" min={0} max={item.max_marks} value={scores[index] ?? 0} onChange={(event) => setScores((current) => current.map((value, position) => position === index ? Number(event.target.value) : value))} /></div>)}<Button className="w-full" onClick={submit}><Gavel className="mr-2 h-4 w-4" />Submit as {role}</Button></div></div>
    {result?.waiting_for && <div className="rounded-lg border bg-muted/30 p-4 text-sm"><LockKeyhole className="mr-2 inline h-4 w-4" />Marks sealed. {result.waiting_for} cannot see them before submitting.</div>}
    {result?.arbitration && <div className="space-y-4 rounded-xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant={result.arbitration.delta > 10 ? "danger" : "success"}>Delta {Number(result.arbitration.delta).toFixed(1)}%</Badge><Badge variant="warning">{String(result.arbitration.disagreement_type).replace("_", " ")}</Badge><span className="text-sm text-muted-foreground">E1 {result.arbitration.s1} · E2 {result.arbitration.s2}</span></div>{result.arbitration.disagreement_profile?.map((item: any) => <div key={item.label} className="grid grid-cols-[1fr_80px] items-center gap-3"><span className="text-sm">{item.label}</span><div className="rounded px-2 py-1 text-center text-xs font-medium" style={{ backgroundColor: `hsl(0 84% 60% / ${Math.max(.08, item.gapPercent / 100)})` }}>{item.e1} / {item.e2}</div></div>)}</div>}
  </div>;
}
