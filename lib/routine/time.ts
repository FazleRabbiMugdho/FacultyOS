export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

export function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function enumerateStarts(start: number, end: number, duration: number, increment: number) {
  const result: number[] = [];
  for (let minute = start; minute + duration <= end; minute += increment) result.push(minute);
  return result;
}
