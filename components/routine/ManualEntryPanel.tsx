"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAY_LABELS, minutesToTime, timeToMinutes } from "@/lib/routine/time";

export function ManualEntryPanel({ context, term, reload }: { context: any; term: any; reload: () => Promise<void> }) {
  const [requirementId, setRequirementId] = React.useState(context.requirements[0]?.id || "");
  const [roomId, setRoomId] = React.useState(context.rooms[0]?.id || "");
  const [day, setDay] = React.useState(term.teaching_days[0]);
  const [start, setStart] = React.useState("08:00");
  const requirement = context.requirements.find((item: any) => item.id === requirementId);

  async function add() {
    if (!context.routine || !requirement) return toast.error("Generate a draft and select a requirement first");
    const startMinute = timeToMinutes(start);
    const sameRequirement = context.entries.filter((item: any) => item.requirement_id === requirement.id);
    const response = await fetch("/api/routine/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routine_id: context.routine.id, term_id: term.id, requirement_id: requirement.id, course_id: requirement.course_id, instructor_id: requirement.instructor_id, cohort_id: requirement.cohort_id, room_id: roomId, session_type: requirement.session_type, session_index: sameRequirement.length + 1, day_of_week: day, start_minute: startMinute, end_minute: startMinute + requirement.duration_minutes, source: "manual", score: 0, explanation: "Manually assigned after empty-slot validation." }) });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error);
    toast.success("Course assigned to the empty slot"); await reload();
  }

  async function remove(id: string) { const response = await fetch("/api/routine/entries", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); const data = await response.json(); if (!response.ok) return toast.error(data.error); toast.success("Routine entry removed"); await reload(); }

  return <div className="space-y-3 border-t pt-5">
    <div><h3 className="text-sm font-semibold">Manual empty-slot assignment</h3><p className="text-xs text-muted-foreground">The API rejects occupied instructor, room, or cohort ranges with HTTP 409.</p></div>
    <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-4">
      <div><Label>Requirement</Label><Select value={requirementId} onValueChange={setRequirementId}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{context.requirements.map((item:any)=><SelectItem key={item.id} value={item.id}>{context.courses.find((course:any)=>course.id===item.course_id)?.code} · {item.session_type}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Room</Label><Select value={roomId} onValueChange={setRoomId}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{context.rooms.map((item:any)=><SelectItem key={item.id} value={item.id}>{item.code} · {item.capacity}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Day</Label><Select value={String(day)} onValueChange={(value)=>setDay(Number(value))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{term.teaching_days.map((item:number)=><SelectItem key={item} value={String(item)}>{DAY_LABELS[item]}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Start</Label><Input type="time" step={600} value={start} onChange={(event)=>setStart(event.target.value)}/></div>
      <Button className="md:col-span-4" onClick={add} disabled={!context.routine || context.routine.status === "published"}><Plus className="mr-2 h-4 w-4"/>Assign course to slot</Button>
    </div>
    {context.entries.length > 0 && <div className="overflow-x-auto rounded-xl border"><table className="w-full text-xs"><thead className="bg-muted/40 text-left"><tr><th className="p-3">Course</th><th>Session</th><th>Day/time</th><th>Room</th><th/></tr></thead><tbody>{context.entries.map((entry:any)=><tr key={entry.id} className="border-t"><td className="p-3 font-semibold">{context.courses.find((item:any)=>item.id===entry.course_id)?.code}</td><td className="capitalize">{entry.session_type}</td><td>{DAY_LABELS[entry.day_of_week]} {minutesToTime(entry.start_minute)}–{minutesToTime(entry.end_minute)}</td><td>{context.rooms.find((item:any)=>item.id===entry.room_id)?.code}</td><td><Button variant="ghost" size="icon" disabled={context.routine.status==='published'} onClick={()=>remove(entry.id)}><Trash2 className="h-4 w-4"/></Button></td></tr>)}</tbody></table></div>}
  </div>;
}
