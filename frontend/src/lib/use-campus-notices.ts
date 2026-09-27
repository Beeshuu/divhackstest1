"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CampusEvent } from "@/types/event";

export type NotificationAction = "freeFood" | "happening";

export type NoticeIcon = "bell" | "calendar" | "check" | "food" | "radio";

export interface CampusNotice {
  id: string;
  title: string;
  body: string;
  time: string;
  createdAt: number;
  eventId?: string;
  action?: NotificationAction;
  icon: NoticeIcon;
}

const STARTER: CampusNotice[] = [
  {
    id: "seed-welcome",
    title: "Welcome to Campus Connect",
    body: "Save events, tap I'm Going, or ask Gemini what's nearby.",
    time: "Today",
    createdAt: 0,
    icon: "bell",
  },
];

function storageKey(userId: number): string {
  return `campus-connect-notices:${userId}`;
}

function relativeTime(createdAt: number, now = Date.now()): string {
  if (!createdAt) return "Today";
  const minutes = Math.round((now - createdAt) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return "Earlier";
}

interface StoredNotices {
  notices: CampusNotice[];
  reminded: string[];
  seenAt: number;
}

function readStore(userId: number): StoredNotices {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return { notices: [], reminded: [], seenAt: 0 };
    const parsed = JSON.parse(raw) as Partial<StoredNotices>;
    return {
      notices: Array.isArray(parsed.notices) ? parsed.notices : [],
      reminded: Array.isArray(parsed.reminded) ? parsed.reminded : [],
      seenAt: typeof parsed.seenAt === "number" ? parsed.seenAt : 0,
    };
  } catch {
    return { notices: [], reminded: [], seenAt: 0 };
  }
}

/**
 * Bell notices for joining an event and for the 30-minute start reminder.
 * Reminders are checked every 15 seconds while the map is open.
 */
export function useCampusNotices(
  userId: number | undefined,
  events: CampusEvent[],
  going: Set<string>,
  deliverPhoton?: (title: string, body: string) => void,
) {
  const [notices, setNotices] = useState<CampusNotice[]>([]);
  const [seenAt, setSeenAt] = useState(0);
  const reminded = useRef(new Set<string>());
  const ready = useRef(false);

  useEffect(() => {
    if (!userId) {
      setNotices([]);
      setSeenAt(0);
      reminded.current = new Set();
      ready.current = false;
      return;
    }
    const stored = readStore(userId);
    setNotices(stored.notices);
    setSeenAt(stored.seenAt);
    reminded.current = new Set(stored.reminded);
    ready.current = true;
  }, [userId]);

  useEffect(() => {
    if (!userId || !ready.current) return;
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({
        notices,
        reminded: [...reminded.current],
        seenAt,
      }),
    );
  }, [userId, notices, seenAt]);

  const pushNotice = useCallback((notice: Omit<CampusNotice, "id" | "createdAt" | "time"> & { id?: string }) => {
    const createdAt = Date.now();
    const next: CampusNotice = {
      ...notice,
      id: notice.id ?? `notice-${createdAt}`,
      createdAt,
      time: "Just now",
    };
    setNotices((prev) => [next, ...prev.filter((item) => item.id !== next.id)].slice(0, 40));
    deliverPhoton?.(next.title, next.body);
  }, [deliverPhoton]);

  const notifyJoin = useCallback(
    (event: CampusEvent) => {
      pushNotice({
        id: `join-${event.id}-${Date.now()}`,
        title: "You're going",
        body: `${event.title} at ${event.locationName}. We'll remind you 30 minutes before it starts.`,
        eventId: event.id,
        icon: "check",
      });
    },
    [pushNotice],
  );

  useEffect(() => {
    if (!ready.current) return;

    const tick = () => {
      const now = Date.now();
      for (const id of going) {
        if (reminded.current.has(id)) continue;
        const event = events.find((item) => item.id === id);
        if (!event?.startsAt) continue;
        const start = new Date(event.startsAt).getTime();
        if (Number.isNaN(start)) continue;
        const remindAt = start - 30 * 60 * 1000;
        if (now < remindAt || now >= start) continue;
        reminded.current.add(id);
        pushNotice({
          id: `remind-${event.id}`,
          title: "Starting in 30 minutes",
          body: `${event.title} at ${event.locationName} · ${event.startTime}`,
          eventId: event.id,
          icon: "calendar",
        });
      }
    };

    tick();
    const timer = window.setInterval(tick, 15_000);
    return () => window.clearInterval(timer);
  }, [going, events, pushNotice]);

  const displayNotices = useMemo(() => {
    const now = Date.now();
    const live = notices.map((notice) => ({ ...notice, time: relativeTime(notice.createdAt, now) }));
    return live.length > 0 ? live : STARTER;
  }, [notices]);

  const unread = notices.filter((notice) => notice.createdAt > seenAt).length;

  const markSeen = useCallback(() => {
    setSeenAt(Date.now());
  }, []);

  return { notices: displayNotices, unread, markSeen, notifyJoin };
}
