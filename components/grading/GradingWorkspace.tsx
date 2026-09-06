"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AiGradeTab } from "./AiGradeTab";
import { DoubleBlindTab } from "./DoubleBlindTab";
import { ReliabilityTab } from "./ReliabilityTab";
import type { GradingContext } from "./types";

export function GradingWorkspace() {
  const searchParams = useSearchParams();
  const [context, setContext] = React.useState<GradingContext | null>(null);
  const [error, setError] = React.useState("");
  const load = React.useCallback(async () => { try { const response = await fetch("/api/grading/context", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setContext(data); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load grading data"); } }, []);
  React.useEffect(() => { void load(); }, [load]);
  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">{error}</div>;
  if (!context) return <div className="space-y-3"><Skeleton className="h-10 w-80" /><Skeleton className="h-96 w-full" /></div>;
  return <Tabs defaultValue="ai" className="space-y-5"><TabsList className="grid h-auto w-full grid-cols-3 sm:w-[520px]"><TabsTrigger value="ai">AI Grade</TabsTrigger><TabsTrigger value="blind">Double-Blind</TabsTrigger><TabsTrigger value="reliability">Reliability</TabsTrigger></TabsList><TabsContent value="ai"><AiGradeTab questions={context.questions} initialQuestionId={searchParams.get("question_id")} onComplete={load} /></TabsContent><TabsContent value="blind"><DoubleBlindTab scripts={context.scripts} questions={context.questions} onComplete={load} /></TabsContent><TabsContent value="reliability"><ReliabilityTab questions={context.questions} grades={context.grades} arbitrations={context.arbitrations} /></TabsContent></Tabs>;
}