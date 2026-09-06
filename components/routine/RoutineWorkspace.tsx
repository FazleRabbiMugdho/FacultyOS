"use client";

import * as React from "react";
import { CalendarCheck, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SetupPanel } from "./SetupPanel";
import { WeeklyGrid } from "./WeeklyGrid";
import { ManualEntryPanel } from "./ManualEntryPanel";

export function RoutineWorkspace() {
  const [context,setContext]=React.useState<any>(null); const [termId,setTermId]=React.useState(""); const [generating,setGenerating]=React.useState(false); const [summary,setSummary]=React.useState<any>(null);
  const load=React.useCallback(async()=>{const response=await fetch('/api/routine/context',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error);setContext(data);setTermId((current)=>current||data.terms[0]?.id||"");},[]);
  React.useEffect(()=>{void load().catch((error)=>toast.error(error.message));},[load]);
  if(!context)return <div className="space-y-3"><Skeleton className="h-10 w-80"/><Skeleton className="h-96 w-full"/></div>;
  const scheduler=["admin","senior"].includes(context.user.role); const term=context.terms.find((item:any)=>item.id===termId)||context.terms[0];
  async function generate(){setGenerating(true);try{const response=await fetch('/api/routine/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({term_id:term.id,name:`${term.name} Weekly Routine`})});const data=await response.json();setSummary(data);if(!response.ok)throw new Error(data.error||'No feasible schedule');toast.success(`Assigned ${data.entries.length} sessions without collisions`);await load();}catch(error){toast.error(error instanceof Error?error.message:'Generation failed');}finally{setGenerating(false);}}
  async function publish(){const response=await fetch('/api/routine/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({routine_id:context.routine.id})});const data=await response.json();if(!response.ok)return toast.error(data.error);toast.success('Routine published and locked');await load();}
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Select value={termId} onValueChange={setTermId}><SelectTrigger className="w-56"><SelectValue/></SelectTrigger><SelectContent>{context.terms.map((item:any)=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>{context.demo_mode&&<Badge variant="warning">Demo storage</Badge>}{context.routine&&<Badge variant={context.routine.status==='published'?'success':'secondary'}>{context.routine.status}</Badge>}</div>{scheduler&&<div className="flex gap-2"><Button variant="outline" onClick={generate} disabled={generating||context.routine?.status==='published'}><RefreshCw className={`mr-2 h-4 w-4 ${generating?'animate-spin':''}`}/>{context.routine?'Regenerate':'Generate'} routine</Button><Button onClick={publish} disabled={!context.routine||context.routine.status==='published'}><Send className="mr-2 h-4 w-4"/>Publish</Button></div>}</div>
    {summary&&!summary.feasible&&<div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4"><p className="font-semibold">No complete routine is feasible</p>{summary.unscheduled?.map((item:any,index:number)=><p key={index} className="mt-1 text-xs text-muted-foreground">{item.reason}</p>)}</div>}
    {summary?.feasible&&<div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Assigned sessions</p><p className="text-xl font-semibold">{summary.entries.length}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Conflicts avoided</p><p className="text-xl font-semibold">{summary.avoidedConflicts}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Validation</p><p className="flex items-center gap-1 text-sm font-semibold text-emerald-600"><ShieldCheck className="h-4 w-4"/>All hard constraints passed</p></div></div>}
    <Tabs defaultValue="timetable" className="space-y-5"><TabsList><TabsTrigger value="timetable"><CalendarCheck className="mr-2 h-4 w-4"/>Weekly timetable</TabsTrigger><TabsTrigger value="setup">Requirements & availability</TabsTrigger></TabsList><TabsContent value="timetable" className="space-y-5">{context.entries.length?<WeeklyGrid term={term} entries={context.entries} unavailable={context.unavailable} rooms={context.rooms} cohorts={context.cohorts} courses={context.courses}/>:<div className="rounded-xl border border-dashed p-12 text-center"><CalendarCheck className="mx-auto mb-3 h-8 w-8 text-primary"/><h3 className="font-semibold">No routine generated yet</h3><p className="mt-1 text-sm text-muted-foreground">Configure teaching requirements, then generate a conflict-free draft.</p></div>}{scheduler&&<ManualEntryPanel context={context} term={term} reload={load}/>}</TabsContent><TabsContent value="setup"><SetupPanel context={context} reload={load}/></TabsContent></Tabs>
  </div>;
}
