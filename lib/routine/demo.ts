import type { AcademicTerm, BusyPeriod, Cohort, Room, RoutineEntry, ScheduleRequirement } from "./types";

const ids = {
  term: "a0000000-0000-4000-8000-000000000001",
  lecture: "a0000000-0000-4000-8000-000000000002",
  lab: "a0000000-0000-4000-8000-000000000003",
  cohort: "a0000000-0000-4000-8000-000000000004",
};

interface DemoStore {
  terms: AcademicTerm[];
  rooms: Room[];
  cohorts: Cohort[];
  requirements: ScheduleRequirement[];
  unavailable: BusyPeriod[];
  routine: { id: string; term_id: string; name: string; status: "draft" | "published"; generated_at?: string; published_at?: string } | null;
  entries: RoutineEntry[];
}

const globalStore = globalThis as typeof globalThis & { __facultyOsRoutineDemo?: DemoStore };
export const routineDemoStore: DemoStore = globalStore.__facultyOsRoutineDemo ?? {
  terms: [{ id: ids.term, name: "Fall 2026", starts_on: "2026-09-01", ends_on: "2026-12-31", teaching_days: [0,1,2,3,4], day_start_minute: 480, day_end_minute: 1020, slot_increment_minutes: 10, breaks: [{ start_minute: 780, end_minute: 840, label: "Lunch" }], is_active: true }],
  rooms: [
    { id: ids.lecture, code: "A-201", name: "Lecture Room A-201", capacity: 60, room_type: "lecture", location: "Academic Building A", amenities: ["projector"], is_active: true },
    { id: ids.lab, code: "LAB-1", name: "Computing Lab 1", capacity: 40, room_type: "lab", location: "Engineering Building", amenities: ["computers", "projector"], is_active: true },
  ],
  cohorts: [{ id: ids.cohort, code: "CSE-3A", name: "CSE Year 3 Section A", department: "CSE", semester: 5, expected_size: 32, is_active: true }],
  requirements: [], unavailable: [], routine: null, entries: [],
};
globalStore.__facultyOsRoutineDemo = routineDemoStore;

export function seedDemoRequirements(courseId?: string, instructorId?: string) {
  if (!courseId || !instructorId || routineDemoStore.requirements.length) return;
  routineDemoStore.requirements.push(
    { id: crypto.randomUUID(), term_id: ids.term, course_id: courseId, instructor_id: instructorId, cohort_id: ids.cohort, session_type: "lecture", sessions_per_week: 3, duration_minutes: 50, required_room_type: "lecture", preferred_days: [0,2,4], preferred_start_minute: 540, preferred_end_minute: 780 },
    { id: crypto.randomUUID(), term_id: ids.term, course_id: courseId, instructor_id: instructorId, cohort_id: ids.cohort, session_type: "lab", sessions_per_week: 1, duration_minutes: 150, required_room_type: "lab", preferred_days: [1,3], preferred_start_minute: 840, preferred_end_minute: 1020 },
  );
}
