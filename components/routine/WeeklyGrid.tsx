"use client";

import { LockKeyhole, MapPin } from "lucide-react";
import { DAY_LABELS, minutesToTime } from "@/lib/routine/time";
import type { AcademicTerm, BusyPeriod, Cohort, Room, RoutineEntry } from "@/lib/routine/types";

const COURSE_COLORS = ["border-indigo-500 bg-indigo-500/15", "border-emerald-500 bg-emerald-500/15", "border-amber-500 bg-amber-500/15", "border-rose-500 bg-rose-500/15", "border-cyan-500 bg-cyan-500/15"];

export function WeeklyGrid({ term, entries, unavailable, rooms, cohorts, courses }: { term: AcademicTerm; entries: RoutineEntry[]; unavailable: BusyPeriod[]; rooms: Room[]; cohorts: Cohort[]; courses: Array<{ id: string; code: string; title: string }> }) {
  const total = term.day_end_minute - term.day_start_minute;
  const courseIndex = new Map(courses.map((course, index) => [course.id, index]));
  return <div className="overflow-x-auto rounded-xl border bg-card">
    <div className="grid min-w-[880px] grid-cols-[76px_repeat(5,minmax(150px,1fr))] border-b bg-muted/40">
      <div className="p-3 text-xs font-semibold text-muted-foreground">Time</div>
      {term.teaching_days.slice(0, 5).map((day) => <div key={day} className="border-l p-3 text-center text-sm font-semibold">{DAY_LABELS[day]}</div>)}
    </div>
    <div className="grid min-w-[880px] grid-cols-[76px_repeat(5,minmax(150px,1fr))]">
      <div className="relative h-[720px] bg-muted/20">
        {Array.from({ length: Math.floor(total / 60) + 1 }, (_, index) => term.day_start_minute + index * 60).map((minute) => <div key={minute} className="absolute right-2 text-[10px] text-muted-foreground" style={{ top: `${((minute - term.day_start_minute) / total) * 100}%`, transform: "translateY(-50%)" }}>{minutesToTime(minute)}</div>)}
      </div>
      {term.teaching_days.slice(0, 5).map((day) => <div key={day} className="relative h-[720px] border-l bg-[linear-gradient(to_bottom,hsl(var(--border)/.45)_1px,transparent_1px)] bg-[length:100%_80px]">
        {unavailable.filter((period) => period.day_of_week === day).map((period, index) => <div key={period.id || index} className="absolute inset-x-1 flex items-center justify-center rounded border border-dashed border-muted-foreground/30 bg-muted/70 px-1 text-[10px] text-muted-foreground" style={{ top: `${((period.start_minute - term.day_start_minute) / total) * 100}%`, height: `${((period.end_minute - period.start_minute) / total) * 100}%` }}><LockKeyhole className="mr-1 h-3 w-3" />Blocked</div>)}
        {entries.filter((entry) => entry.day_of_week === day).map((entry) => {
          const course = courses.find((item) => item.id === entry.course_id);
          const room = rooms.find((item) => item.id === entry.room_id);
          const cohort = cohorts.find((item) => item.id === entry.cohort_id);
          const color = COURSE_COLORS[(courseIndex.get(entry.course_id) ?? 0) % COURSE_COLORS.length];
          return <div key={entry.id || `${entry.requirement_id}-${entry.session_index}`} className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 p-2 shadow-sm ${color}`} style={{ top: `${((entry.start_minute - term.day_start_minute) / total) * 100}%`, height: `${Math.max(5, ((entry.end_minute - entry.start_minute) / total) * 100)}%` }} title={entry.explanation}>
            <div className="truncate text-xs font-bold">{course?.code || "Course"} · {entry.session_type}</div>
            <div className="mt-0.5 truncate text-[10px]">{minutesToTime(entry.start_minute)}–{minutesToTime(entry.end_minute)}</div>
            <div className="mt-1 flex items-center gap-1 truncate text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" />{room?.code || entry.room_id.slice(0, 6)} · {cohort?.code}</div>
          </div>;
        })}
      </div>)}
    </div>
  </div>;
}
