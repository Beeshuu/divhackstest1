/** Joins conditional class names without pulling in a dependency. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** 1234 -> "1,234" for social counters. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** "13:30" (from <input type="time">) -> "1:30 PM". */
export function formatClock(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function minutesOfDay(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function humanizeMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr`;
}

/** "Ends in 34 min" / "Starts in 2 hr" / "Ended", relative to `now`. */
export function timeStatusFor(start: string, end: string, now: Date = new Date()): string {
  const current = now.getHours() * 60 + now.getMinutes();
  const from = minutesOfDay(start);
  const to = minutesOfDay(end);
  if (current < from) return `Starts in ${humanizeMinutes(from - current)}`;
  if (current < to) return `Ends in ${humanizeMinutes(to - current)}`;
  return "Ended";
}

/** "Today, Sep 26" in New York, matching University Life listings. */
export function todayLabel(now: Date = new Date()): string {
  return `Today, ${now.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}`;
}

function newYorkDay(value: Date): string {
  return value.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function isEventToday(event: { dateLabel: string; startsAt?: string }, now: Date = new Date()): boolean {
  if (event.startsAt) {
    const start = new Date(event.startsAt);
    if (!Number.isNaN(start.valueOf())) return newYorkDay(start) === newYorkDay(now);
  }
  return event.dateLabel.startsWith("Today");
}

/** Campus-map events. TBD and remote listings have their own sidebar lists. */
export function isMappedCampusEvent(event: { locationKind?: string }): boolean {
  return event.locationKind !== "tbd" && event.locationKind !== "remote";
}

/** True if end is strictly after start (both "HH:MM"). */
export function isTimeRangeValid(start: string, end: string): boolean {
  return Boolean(start && end) && minutesOfDay(end) > minutesOfDay(start);
}

/** Initials stand in for a profile photo until uploads exist. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function isEventEnded(event: { timeStatus: string }): boolean {
  return event.timeStatus === "Ended";
}

/** Today's date at an `HH:MM` clock in the local timezone. */
export function dateTodayAt(clock: string, now = new Date()): Date {
  const [hours, minutes] = clock.split(":").map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function clockLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

export function dateLabelFrom(date: Date, now = new Date()): string {
  const ny = (value: Date) =>
    value.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  if (ny(date) === ny(now)) return `Today, ${ny(date)}`;
  const weekday = date.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short" });
  return `${weekday}, ${ny(date)}`;
}

export function timeStatusFromDates(start: Date, end: Date, now = new Date()): string {
  if (now < start) {
    const minutes = Math.round((start.getTime() - now.getTime()) / 60000);
    if (minutes < 60) return `Starts in ${minutes} min`;
    if (minutes < 24 * 60) return `Starts in ${Math.round(minutes / 60)} hr`;
    return `Starts ${dateLabelFrom(start, now)}`;
  }
  if (now < end) {
    const minutes = Math.round((end.getTime() - now.getTime()) / 60000);
    if (minutes < 60) return `Ends in ${minutes} min`;
    return `Ends in ${Math.round(minutes / 60)} hr`;
  }
  return "Ended";
}
