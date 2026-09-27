import { eventCampusId, sharesCampusMap, type CampusId } from "./campuses";
import { isEventToday } from "./utils";
import type { CampusEvent } from "@/types/event";

export const TRENDING_LIMIT = 5;

function startMs(event: CampusEvent): number {
  if (event.startsAt) {
    const start = Date.parse(event.startsAt);
    if (!Number.isNaN(start)) return start;
  }
  return Number.POSITIVE_INFINITY;
}

function isComingUpSoon(event: CampusEvent, now: number): boolean {
  if (event.endsAt) {
    const end = Date.parse(event.endsAt);
    if (!Number.isNaN(end)) return end > now;
  }
  if (event.startsAt) {
    const start = Date.parse(event.startsAt);
    if (!Number.isNaN(start)) return start > now || isEventToday(event, new Date(now));
  }
  return event.timeStatus !== "Ended";
}

function population(event: CampusEvent, going: Set<string>): number {
  return event.goingCount + (going.has(event.id) ? 1 : 0);
}

/** Top campus events that have not ended, ranked by attendance then soonest start. */
export function pickTrendingEvents(
  events: CampusEvent[],
  opts: {
    campusId?: CampusId;
    rejected?: Set<string>;
    going?: Set<string>;
    now?: number;
  } = {},
): CampusEvent[] {
  const now = opts.now ?? Date.now();
  const going = opts.going ?? new Set<string>();
  const rejected = opts.rejected ?? new Set<string>();
  return events
    .filter((event) => {
      if (rejected.has(event.id)) return false;
      if (opts.campusId && !sharesCampusMap(eventCampusId(event), opts.campusId)) return false;
      return isComingUpSoon(event, now);
    })
    .sort((a, b) => {
      const byCrowd = population(b, going) - population(a, going);
      if (byCrowd !== 0) return byCrowd;
      return startMs(a) - startMs(b);
    })
    .slice(0, TRENDING_LIMIT);
}
