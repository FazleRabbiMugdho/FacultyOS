"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAY_LABELS, timeToMinutes } from "@/lib/routine/time";

export function SetupPanel({ context, reload }: { context: any; reload: () => Promise<void> }) {
  const scheduler = ["admin", "senior"].includes(context.user.role);
  const term = context.terms[0];
  const [sessionType, setSessionType] = React.useState("lecture");
  const [courseId, setCourseId] = React.useState(context.courses[0]?.id || "");
  const [instructorId, setInstructorId] = React.useState(context.profiles[0]?.id || "");
  const [cohortId, setCohortId] = React.useState(context.cohorts[0]?.id || "");
  const [count, setCount] = React.useState(3);
  const [duration, setDuration] = React.useState(50);
  const [resourceType, setResourceType] = React.useState("instructor");
  const [resourceId, setResourceId] = React.useState(context.profiles[0]?.id || "");
  const [day, setDay] = React.useState(0);
  const [from, setFrom] = React.useState("08:00");
  const [to, setTo] = React.useState("09:00");

  async function request(url: string, body: unknown, method = "POST") { const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }
  async function addRequirement() { try { await request("/api/routine/requirements", { term_id: term.id, course_id: courseId, instructor_id: instructorId, cohort_id: cohortId, session_type: sessionType, sessions_per_week: count, duration_minutes: duration, required_room_type: sessionType === "lab" ? "lab" : "lecture", preferred_days: sessionType === "lab" ? [1,3] : [0,2,4], preferred_start_minute: 540, preferred_end_minute: 1020 }); toast.success("Teaching requirement saved"); await reload(); } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); } }
  async function addUnavailable() { try { await request("/api/routine/availability", { term_id: term.id, instructor_id: resourceType === "instructor" ? resourceId : null, room_id: resourceType === "room" ? resourceId : null, cohort_id: resourceType === "cohort" ? resourceId : null, day_of_week: day, start_minute: timeToMinutes(from), end_minute: timeToMinutes(to), reason: "Unavailable" }); toast.success("Blocked period saved"); await reload(); } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); } }
  function resources() { return resourceType === "room" ? context.rooms : resourceType === "cohort" ? context.cohorts : context.profiles; }

  return <div className="space-y-8">
    {!scheduler && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Junior faculty have read-only access. An admin or senior user must modify routine setup.</div>}
    <section className="space-y-4"><div><h3 className="text-base font-semibold">Teaching requirements</h3><p className="text-xs text-muted-foreground">Configure each lecture, lab, or tutorial independently.</p></div>
      {scheduler && <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-3">
        <div><Label>Course</Label><Select value={courseId} onValueChange={setCourseId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{context.courses.map((item:any)=><SelectItem key={item.id} value={item.id}>{item.code} · {item.title}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Instructor</Label><Select value={instructorId} onValueChange={setInstructorId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{context.profiles.map((item:any)=><SelectItem key={item.id} value={item.id}>{item.full_name || item.role}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Cohort</Label><Select value={cohortId} onValueChange={setCohortId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{context.cohorts.map((item:any)=><SelectItem key={item.id} value={item.id}>{item.code}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Session type</Label><Select value={sessionType} onValueChange={setSessionType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["lecture","lab","tutorial"].map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Sessions/week</Label><Input type="number" min={1} max={10} value={count} onChange={(event)=>setCount(Number(event.target.value))}/></div>
        <div><Label>Duration (minutes)</Label><Input type="number" step={10} min={10} value={duration} onChange={(event)=>setDuration(Number(event.target.value))}/></div>
        <Button onClick={addRequirement} className="md:col-span-3"><Plus className="mr-2 h-4 w-4"/>Save requirement</Button>
      </div>}
      <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted/40 text-left text-xs"><tr><th className="p-3">Course</th><th>Type</th><th>Sessions</th><th>Duration</th><th>Cohort</th>{scheduler&&<th/>}</tr></thead><tbody>{context.requirements.map((item:any)=><tr key={item.id} className="border-t"><td className="p-3">{context.courses.find((course:any)=>course.id===item.course_id)?.code}</td><td className="capitalize">{item.session_type}</td><td>{item.sessions_per_week}/week</td><td>{item.duration_minutes} min</td><td>{context.cohorts.find((cohort:any)=>cohort.id===item.cohort_id)?.code}</td>{scheduler&&<td><Button variant="ghost" size="icon" onClick={async()=>{await request('/api/routine/requirements',{id:item.id},'DELETE');await reload();}}><Trash2 className="h-4 w-4"/></Button></td>}</tr>)}</tbody></table></div>
    </section>
    <section className="space-y-4"><div><h3 className="text-base font-semibold">Unavailable periods</h3><p className="text-xs text-muted-foreground">Block an instructor, room, or cohort before generation.</p></div>
      {scheduler && <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-5"><Select value={resourceType} onValueChange={(value)=>{setResourceType(value); const list=value==='room'?context.rooms:value==='cohort'?context.cohorts:context.profiles;setResourceId(list[0]?.id||'');}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["instructor","room","cohort"].map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={resourceId} onValueChange={setResourceId}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{resources().map((item:any)=><SelectItem key={item.id} value={item.id}>{item.code||item.full_name||item.name}</SelectItem>)}</SelectContent></Select><Select value={String(day)} onValueChange={(value)=>setDay(Number(value))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{term.teaching_days.map((item:number)=><SelectItem key={item} value={String(item)}>{DAY_LABELS[item]}</SelectItem>)}</SelectContent></Select><Input type="time" value={from} onChange={(event)=>setFrom(event.target.value)}/><Input type="time" value={to} onChange={(event)=>setTo(event.target.value)}/><Button onClick={addUnavailable} className="md:col-span-5">Block selected period</Button></div>}
      <div className="flex flex-wrap gap-2">{context.unavailable.map((item:any)=><span key={item.id} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">{DAY_LABELS[item.day_of_week]} {item.start_minute/60}:00–{item.end_minute/60}:00</span>)}</div>
    </section>
  </div>;
}
