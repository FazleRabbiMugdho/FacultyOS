import solver from "javascript-lp-solver";
import type { Room, RoutineEntry, RoutineGenerationInput, RoutineGenerationResult, ScheduleRequirement } from "./types";
import { enumerateStarts, overlaps } from "./time";

interface Candidate { variable: string; entry: RoutineEntry; }

function roomFits(room: Room, requirement: ScheduleRequirement, cohortSize: number) {
  const typeFits = requirement.required_room_type === "lab"
    ? room.room_type === "lab" || room.room_type === "hybrid"
    : room.room_type === "lecture" || room.room_type === "hybrid";
  return room.is_active && typeFits && room.capacity >= cohortSize;
}

function resourceBlocked(input: RoutineGenerationInput, requirement: ScheduleRequirement, roomId: string, day: number, start: number, end: number) {
  const periods = [...input.occupied, ...input.unavailable];
  return periods.some((period) => period.day_of_week === day
    && overlaps(start, end, period.start_minute, period.end_minute)
    && (period.instructor_id === requirement.instructor_id || period.cohort_id === requirement.cohort_id || period.room_id === roomId));
}

function inBreak(input: RoutineGenerationInput, start: number, end: number) {
  return input.term.breaks.some((period) => overlaps(start, end, period.start_minute, period.end_minute));
}

function preferenceScore(requirement: ScheduleRequirement, day: number, start: number, ordinal: number) {
  let score = 1000;
  if (requirement.preferred_days.length) score += requirement.preferred_days.includes(day) ? 150 : 0;
  if (requirement.preferred_start_minute != null && requirement.preferred_end_minute != null) {
    score += start >= requirement.preferred_start_minute && start + requirement.duration_minutes <= requirement.preferred_end_minute ? 100 : 0;
  }
  score -= Math.abs(start - 600) / 10;
  score -= day * 0.1 + ordinal * 0.0001;
  return score;
}

function makeQuanta(requirement: ScheduleRequirement, roomId: string, day: number, start: number, end: number, increment: number) {
  const keys: string[] = [];
  for (let minute = start; minute < end; minute += increment) {
    keys.push(`i_${requirement.instructor_id}_${day}_${minute}`);
    keys.push(`c_${requirement.cohort_id}_${day}_${minute}`);
    keys.push(`r_${roomId}_${day}_${minute}`);
  }
  keys.push(`d_${requirement.id}_${day}`);
  return keys;
}

export function generateRoutine(input: RoutineGenerationInput): RoutineGenerationResult {
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = {};
  const variables: Record<string, Record<string, number>> = {};
  const ints: Record<string, 1> = {};
  const candidates: Candidate[] = [];
  const unscheduled: RoutineGenerationResult["unscheduled"] = [];
  let avoidedConflicts = 0;

  for (const requirement of input.requirements) {
    const rooms = input.rooms.filter((room) => roomFits(room, requirement, input.cohortSizes[requirement.cohort_id] ?? 0));
    for (let sessionIndex = 1; sessionIndex <= requirement.sessions_per_week; sessionIndex++) {
      const sessionKey = `session_${requirement.id}_${sessionIndex}`;
      constraints[sessionKey] = { equal: 1 };
      let sessionCandidates = 0;
      let ordinal = 0;
      for (const day of [...input.term.teaching_days].sort()) {
        for (const room of [...rooms].sort((a, b) => a.code.localeCompare(b.code))) {
          for (const start of enumerateStarts(input.term.day_start_minute, input.term.day_end_minute, requirement.duration_minutes, input.term.slot_increment_minutes)) {
            const end = start + requirement.duration_minutes;
            if (inBreak(input, start, end) || resourceBlocked(input, requirement, room.id, day, start, end)) { avoidedConflicts++; continue; }
            const variable = `v${candidates.length}`;
            const objective = preferenceScore(requirement, day, start, ordinal++);
            const entry: RoutineEntry = { term_id: input.term.id, requirement_id: requirement.id, course_id: requirement.course_id, instructor_id: requirement.instructor_id, cohort_id: requirement.cohort_id, room_id: room.id, session_type: requirement.session_type, session_index: sessionIndex, day_of_week: day, start_minute: start, end_minute: end, source: "generated", score: objective, explanation: `Best-fit ${requirement.session_type}; all instructor, room, and cohort constraints satisfied.` };
            variables[variable] = { objective, [sessionKey]: 1 };
            makeQuanta(requirement, room.id, day, start, end, input.term.slot_increment_minutes).forEach((key) => { constraints[key] = { max: 1 }; variables[variable][key] = 1; });
            ints[variable] = 1;
            candidates.push({ variable, entry });
            sessionCandidates++;
          }
        }
      }
      if (!sessionCandidates) unscheduled.push({ requirement_id: requirement.id, session_index: sessionIndex, reason: rooms.length ? "No empty time range satisfies all resources." : "No active room satisfies capacity and room type." });
    }
  }

  if (unscheduled.length) return { feasible: false, entries: [], score: 0, avoidedConflicts, unscheduled };
  const solution = solver.Solve({ optimize: "objective", opType: "max", constraints, variables, ints });
  if (!solution.feasible) return { feasible: false, entries: [], score: 0, avoidedConflicts, unscheduled: input.requirements.map((item) => ({ requirement_id: item.id, session_index: 0, reason: "Available candidates cannot satisfy all resource constraints together." })) };
  const entries = candidates.filter((candidate) => Number(solution[candidate.variable]) > 0.5).map((candidate) => candidate.entry);
  const required = input.requirements.reduce((sum, item) => sum + item.sessions_per_week, 0);
  if (entries.length !== required) return { feasible: false, entries: [], score: 0, avoidedConflicts, unscheduled: [{ requirement_id: "multiple", session_index: 0, reason: "Solver returned an incomplete assignment." }] };
  entries.sort((a, b) => a.day_of_week - b.day_of_week || a.start_minute - b.start_minute || a.course_id.localeCompare(b.course_id));
  return { feasible: true, entries, score: Number(solution.result) || entries.reduce((sum, item) => sum + item.score, 0), avoidedConflicts, unscheduled: [] };
}
