"use client";

import { useEffect, useState } from "react";

import { isEventEnded } from "./utils";
import type { CampusEvent } from "@/types/event";

export interface EventHistory {
  going: CampusEvent[];
  hosted: CampusEvent[];
  attended: CampusEvent[];
}

const EMPTY: EventHistory = { going: [], hosted: [], attended: [] };

function storageKey(userId: number): string {
  return `campus-connect-history:${userId}`;
}

function upsert(list: CampusEvent[], event: CampusEvent): CampusEvent[] {
  return [event, ...list.filter((item) => item.id !== event.id)];
}

function readHistory(userId: number): EventHistory {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<EventHistory>;
    return {
      going: Array.isArray(parsed.going) ? parsed.going : [],
      hosted: Array.isArray(parsed.hosted) ? parsed.hosted : [],
      attended: Array.isArray(parsed.attended) ? parsed.attended : [],
    };
  } catch {
    return EMPTY;
  }
}

function sameIds(left: CampusEvent[], right: CampusEvent[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((event, index) => event.id === right[index]?.id && event.timeStatus === right[index]?.timeStatus);
}

/**
 * Profile lists outlive a single map session. Going / hosted / attended are
 * written from live state, then kept in localStorage after temporary events
 * disappear on refresh.
 */
export function useEventHistory(
  userId: number | undefined,
  events: CampusEvent[],
  going: Set<string>,
): EventHistory {
  const [history, setHistory] = useState<EventHistory>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHistory(EMPTY);
      setReady(false);
      return;
    }
    setHistory(readHistory(userId));
    setReady(true);
  }, [userId]);

  useEffect(() => {
    if (!userId || !ready) return;

    const liveGoing = events.filter((event) => going.has(event.id) && !isEventEnded(event));
    const liveAttended = events.filter((event) => going.has(event.id) && isEventEnded(event));
    const liveHosted = events.filter((event) => event.hostedByMe || event.host === "You");
    const dropped = new Set(events.filter((event) => !going.has(event.id)).map((event) => event.id));

    setHistory((prev) => {
      let nextGoing = prev.going.filter((event) => !dropped.has(event.id));
      for (const event of liveGoing) nextGoing = upsert(nextGoing, event);
      nextGoing = nextGoing.filter((event) => !isEventEnded(event));

      let nextAttended = prev.attended;
      for (const event of liveAttended) nextAttended = upsert(nextAttended, event);
      for (const event of prev.going) {
        if (isEventEnded(event)) nextAttended = upsert(nextAttended, event);
      }

      let nextHosted = prev.hosted;
      for (const event of liveHosted) nextHosted = upsert(nextHosted, event);

      if (
        sameIds(prev.going, nextGoing) &&
        sameIds(prev.hosted, nextHosted) &&
        sameIds(prev.attended, nextAttended)
      ) {
        return prev;
      }
      return { going: nextGoing, hosted: nextHosted, attended: nextAttended };
    });
  }, [userId, events, going, ready]);

  useEffect(() => {
    if (!userId || !ready) return;
    window.localStorage.setItem(storageKey(userId), JSON.stringify(history));
  }, [userId, history, ready]);

  return history;
}
