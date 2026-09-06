export type SessionType = "lecture" | "lab" | "tutorial";
export type RoomType = "lecture" | "lab" | "hybrid";
export type RoutineStatus = "draft" | "published";

export interface AcademicTerm {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  teaching_days: number[];
  day_start_minute: number;
  day_end_minute: number;
  slot_increment_minutes: number;
  breaks: Array<{ start_minute: number; end_minute: number; label?: string }>;
  is_active: boolean;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  capacity: number;
  room_type: RoomType;
  location?: string | null;
  amenities: string[];
  is_active: boolean;
}

export interface Cohort {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  semester?: number | null;
  expected_size: number;
  is_active: boolean;
}

export interface ScheduleRequirement {
  id: string;
  term_id: string;
  course_id: string;
  instructor_id: string;
  cohort_id: string;
  session_type: SessionType;
  sessions_per_week: number;
  duration_minutes: number;
  required_room_type: RoomType;
  preferred_days: number[];
  preferred_start_minute?: number | null;
  preferred_end_minute?: number | null;
  courses?: { code: string; title: string };
  profiles?: { full_name: string | null };
  cohorts?: Cohort;
}

export interface BusyPeriod {
  id?: string;
  term_id: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  instructor_id?: string | null;
  cohort_id?: string | null;
  room_id?: string | null;
}

export interface RoutineEntry {
  id?: string;
  routine_id?: string;
  term_id: string;
  requirement_id: string;
  course_id: string;
  instructor_id: string;
  cohort_id: string;
  room_id: string;
  session_type: SessionType;
  session_index: number;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  source: "generated" | "manual";
  score: number;
  explanation: string;
  courses?: { code: string; title: string };
  rooms?: Room;
  cohorts?: Cohort;
  profiles?: { full_name: string | null };
}

export interface RoutineGenerationInput {
  term: AcademicTerm;
  requirements: ScheduleRequirement[];
  rooms: Room[];
  occupied: RoutineEntry[];
  unavailable: BusyPeriod[];
  cohortSizes: Record<string, number>;
}

export interface RoutineGenerationResult {
  feasible: boolean;
  entries: RoutineEntry[];
  score: number;
  avoidedConflicts: number;
  unscheduled: Array<{ requirement_id: string; session_index: number; reason: string }>;
}
