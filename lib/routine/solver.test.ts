import { describe, expect, it } from "vitest";
import { generateRoutine } from "./solver";
import { overlaps } from "./time";
import type { RoutineGenerationInput } from "./types";

const base: RoutineGenerationInput = {
  term: { id: "term", name: "Fall", starts_on: "2026-09-01", ends_on: "2026-12-31", teaching_days: [0,1,2,3,4], day_start_minute: 480, day_end_minute: 1020, slot_increment_minutes: 10, breaks: [{ start_minute: 780, end_minute: 840 }], is_active: true },
  rooms: [{ id: "lecture", code: "A1", name: "A1", capacity: 40, room_type: "lecture", amenities: [], is_active: true }, { id: "lab", code: "L1", name: "L1", capacity: 35, room_type: "lab", amenities: [], is_active: true }],
  requirements: [
    { id: "req-lecture", term_id: "term", course_id: "course", instructor_id: "teacher", cohort_id: "cohort", session_type: "lecture", sessions_per_week: 3, duration_minutes: 50, required_room_type: "lecture", preferred_days: [0,2,4] },
    { id: "req-lab", term_id: "term", course_id: "course", instructor_id: "teacher", cohort_id: "cohort", session_type: "lab", sessions_per_week: 1, duration_minutes: 150, required_room_type: "lab", preferred_days: [1] },
  ],
  occupied: [], unavailable: [], cohortSizes: { cohort: 30 },
};

describe("routine solver", () => {
  it("treats adjacent ranges as non-overlapping", () => expect(overlaps(480, 530, 530, 580)).toBe(false));

  it("assigns configured lectures and lab without conflicts", () => {
    const result = generateRoutine(base);
    expect(result.feasible).toBe(true);
    expect(result.entries).toHaveLength(4);
    expect(result.entries.filter((entry) => entry.session_type === "lecture").every((entry) => entry.end_minute - entry.start_minute === 50)).toBe(true);
    const lab = result.entries.find((entry) => entry.session_type === "lab")!;
    expect(lab.end_minute - lab.start_minute).toBe(150);
    for (let first = 0; first < result.entries.length; first++) for (let second = first + 1; second < result.entries.length; second++) {
      const a = result.entries[first]; const b = result.entries[second];
      if (a.day_of_week === b.day_of_week) expect(overlaps(a.start_minute, a.end_minute, b.start_minute, b.end_minute)).toBe(false);
    }
  });

  it("never uses occupied or unavailable resources", () => {
    const occupied = [{ term_id: "term", requirement_id: "other", course_id: "other", instructor_id: "other", cohort_id: "other", room_id: "lecture", session_type: "lecture" as const, session_index: 1, day_of_week: 0, start_minute: 480, end_minute: 600, source: "manual" as const, score: 0, explanation: "busy" }];
    const unavailable = [{ term_id: "term", instructor_id: "teacher", day_of_week: 1, start_minute: 480, end_minute: 720 }];
    const result = generateRoutine({ ...base, occupied, unavailable });
    expect(result.feasible).toBe(true);
    expect(result.entries.some((entry) => entry.day_of_week === 0 && entry.room_id === "lecture" && overlaps(entry.start_minute, entry.end_minute, 480, 600))).toBe(false);
    expect(result.entries.some((entry) => entry.day_of_week === 1 && overlaps(entry.start_minute, entry.end_minute, 480, 720))).toBe(false);
  });

  it("is deterministic", () => expect(generateRoutine(base).entries).toEqual(generateRoutine(base).entries));

  it("returns no partial schedule when capacity is infeasible", () => {
    const result = generateRoutine({ ...base, cohortSizes: { cohort: 100 } });
    expect(result.feasible).toBe(false);
    expect(result.entries).toEqual([]);
  });
});
