"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CATEGORY_STYLE } from "./constants";
import { formatClock, isEventToday, timeStatusFor, todayLabel } from "./utils";
import { FEATURED_EVENT_ID, MOCK_EVENTS } from "@/data/mock-events";
import type {
  CampusEvent,
  DateFilter,
  EventCategory,
  EventDraft,
  MapPill,
  SidebarFilter,
} from "@/types/event";

export interface Toast {
  id: number;
  message: string;
}

function matchesQuery(event: CampusEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [event.title, event.category, event.locationName, event.host].some((field) =>
    field.toLowerCase().includes(q),
  );
}

/** Built-in events have a route; live and session-only events use their source URL. */
export function eventPath(event: CampusEvent): string | null {
  if (event.sourceUrl) return event.sourceUrl;
  return event.isTemporary ? null : `/events/${event.id}`;
}

const APP_TITLE = "Campus Connect — Columbia University";

/** Keeps the address bar and tab title in step with the open event. */
function syncUrl(event: CampusEvent | null) {
  const path = event ? eventPath(event) : "/";
  const internal = path && !path.startsWith("http") ? path : "/";
  if (window.location.pathname !== internal) window.history.replaceState(null, "", internal);
  document.title = event ? `${event.title} at ${event.locationName} — Campus Connect` : APP_TITLE;
}

/**
 * All interactive state for the Phase 2 frontend. Everything lives in React
 * memory: going/saved/created events reset on refresh by design.
 */
export function useCampusState(initialEventId?: string) {
  const [liveEvents, setLiveEvents] = useState<CampusEvent[]>([]);
  const [liveStatus, setLiveStatus] = useState<"idle" | "ready" | "error">("idle");
  const [createdEvents, setCreatedEvents] = useState<CampusEvent[]>([]);
  const [selectedId, setSelectedId] = useState(initialEventId ?? FEATURED_EVENT_ID);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialEventId));
  const [going, setGoing] = useState<Set<string>>(() => new Set());
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
  const [mapPill, setMapPill] = useState<MapPill>("trending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | "all">("all");
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const events = useMemo(
    () => [...liveEvents, ...MOCK_EVENTS, ...createdEvents],
    [liveEvents, createdEvents],
  );
  const selectedEvent = events.find((e) => e.id === selectedId);

  const refreshLiveEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/university-life/events");
      if (!response.ok) throw new Error("Could not refresh University Life events.");
      const body = await response.json();
      setLiveEvents(Array.isArray(body.events) ? body.events : []);
      setLiveStatus("ready");
    } catch {
      setLiveStatus((prev) => (prev === "ready" ? "ready" : "error"));
    }
  }, []);

  useEffect(() => {
    void refreshLiveEvents();
    const timer = window.setInterval(() => void refreshLiveEvents(), 3 * 60 * 1000);
    const onFocus = () => void refreshLiveEvents();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshLiveEvents]);

  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        if (!matchesQuery(event, query)) return false;
        if (sidebarFilter === "saved" && !saved.has(event.id)) return false;
        if (sidebarFilter === "tbd") return event.locationKind === "tbd";
        if (sidebarFilter === "remote") return event.locationKind === "remote";
        if (event.locationKind === "tbd" || event.locationKind === "remote") return false;
        if (categoryFilter !== "all" && event.category !== categoryFilter) return false;
        if (dateFilter === "today" && !isEventToday(event)) return false;
        return true;
      }),
    [events, query, sidebarFilter, saved, categoryFilter, dateFilter],
  );

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const selectEvent = useCallback(
    (id: string) => {
      const event = events.find((e) => e.id === id);
      if (!event) return;
      setSelectedId(id);
      setDrawerOpen(true);
      syncUrl(event);
    },
    [events],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    syncUrl(null);
  }, []);

  const toggleIn = (setter: typeof setGoing, id: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGoing = useCallback((id: string) => toggleIn(setGoing, id), []);
  const toggleSaved = useCallback((id: string) => toggleIn(setSaved, id), []);

  const createEvent = useCallback(
    (draft: EventDraft): CampusEvent | null => {
      if (!draft.point) return null;
      const style = CATEGORY_STYLE[draft.category];
      const event: CampusEvent = {
        id: `temp-${Date.now()}`,
        title: draft.title.trim(),
        category: draft.category,
        locationName: draft.locationName.trim() || "Pinned location",
        address: draft.locationName.trim() || "Pinned on the campus map",
        description: draft.description.trim() || "No description provided.",
        mapX: draft.point.x,
        mapY: draft.point.y,
        distance: "On campus",
        timeStatus: timeStatusFor(draft.startTime, draft.endTime),
        startTime: formatClock(draft.startTime),
        endTime: formatClock(draft.endTime),
        dateLabel: todayLabel(),
        startsAt: new Date().toISOString(),
        goingCount: 0,
        interestedCount: 0,
        host: "You",
        markerColor: style.markerColor,
        iconType: style.iconType,
        isTemporary: true,
      };
      setCreatedEvents((prev) => [...prev, event]);
      setSelectedId(event.id);
      setDrawerOpen(true);
      syncUrl(event);
      return event;
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setQuery("");
    setSidebarFilter("all");
    setMapPill("trending");
    setCategoryFilter("all");
    setDateFilter("today");
  }, []);

  return {
    events,
    clearFilters,
    visibleEvents,
    selectedEvent,
    drawerOpen,
    selectEvent,
    closeDrawer,
    going,
    toggleGoing,
    saved,
    toggleSaved,
    query,
    setQuery,
    sidebarFilter,
    setSidebarFilter,
    mapPill,
    setMapPill,
    dateFilter,
    setDateFilter,
    categoryFilter,
    setCategoryFilter,
    createEvent,
    toast,
    showToast,
    dismissToast: () => setToast(null),
    liveStatus,
    tbdCount: events.filter((event) => event.locationKind === "tbd").length,
    remoteCount: events.filter((event) => event.locationKind === "remote").length,
    refreshLiveEvents,
  };
}

export type CampusState = ReturnType<typeof useCampusState>;
