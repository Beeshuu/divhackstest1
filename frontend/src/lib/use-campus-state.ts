"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CATEGORY_STYLE } from "./constants";
import {
  dateLabelFrom,
  dateTodayAt,
  formatClock,
  isEventToday,
  timeStatusFromDates,
} from "./utils";
import { communityEventFromApi } from "./community-events";
import { campusMapToGeo, eventCampusId, getCampus, sharesCampusMap, type CampusId } from "./campuses";
import { pickTrendingEvents } from "./trending-events";
import { FEATURED_EVENT_ID, MOCK_EVENTS } from "@/data/mock-events";
import { isUserLedEvent, USER_LED_EVENTS } from "@/data/user-led-events";
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
function goingKey(userId?: number) {
  return userId ? `campus-connect-going:${userId}` : "campus-connect-going";
}

function rejectedKey(userId?: number) {
  return userId ? `campus-connect-rejected:${userId}` : "campus-connect-rejected";
}

function readIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function useCampusState(
  initialEventId?: string,
  userId?: number,
  userName?: string,
  campusId: CampusId = "columbia",
) {
  const [liveEvents, setLiveEvents] = useState<CampusEvent[]>([]);
  const [communityEvents, setCommunityEvents] = useState<CampusEvent[]>([]);
  const [liveStatus, setLiveStatus] = useState<"idle" | "ready" | "error">("idle");
  const [createdEvents, setCreatedEvents] = useState<CampusEvent[]>([]);
  const [selectedId, setSelectedId] = useState(initialEventId ?? FEATURED_EVENT_ID);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialEventId));
  const [going, setGoing] = useState<Set<string>>(() => readIdSet(goingKey(userId)));
  const [rejected, setRejected] = useState<Set<string>>(() => readIdSet(rejectedKey(userId)));
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
  const [mapPill, setMapPill] = useState<MapPill>("trending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | "all">("all");
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setGoing(readIdSet(goingKey(userId)));
    setRejected(readIdSet(rejectedKey(userId)));
  }, [userId]);

  useEffect(() => {
    window.localStorage.setItem(goingKey(userId), JSON.stringify([...going]));
  }, [userId, going]);

  useEffect(() => {
    window.localStorage.setItem(rejectedKey(userId), JSON.stringify([...rejected]));
  }, [userId, rejected]);

  const events = useMemo(
    () =>
      [...liveEvents, ...USER_LED_EVENTS, ...communityEvents, ...MOCK_EVENTS, ...createdEvents].filter(
        (event) => event.source !== "user" || sharesCampusMap(eventCampusId(event), campusId),
      ),
    [liveEvents, communityEvents, createdEvents, campusId],
  );
  const selectedEvent = events.find((e) => e.id === selectedId);

  const refreshLiveEvents = useCallback(async () => {
    try {
      const response = await fetch(`/api/official-events?campus=${encodeURIComponent(campusId)}`);
      if (!response.ok) throw new Error("Could not refresh official campus events.");
      const body = await response.json();
      setLiveEvents(Array.isArray(body.events) ? body.events : []);
      setLiveStatus("ready");
    } catch {
      setLiveStatus((prev) => (prev === "ready" ? "ready" : "error"));
    }

    try {
      const response = await fetch(`/api/events?campus=${encodeURIComponent(campusId)}`);
      if (!response.ok) return;
      const body: unknown = await response.json();
      const rows = Array.isArray(body) ? body : [];
      const mapped = rows
        .map((row) => communityEventFromApi(row as Parameters<typeof communityEventFromApi>[0], userId))
        .filter((event): event is CampusEvent => Boolean(event));
      setCommunityEvents(mapped);
      setCreatedEvents((prev) => {
        const remaining = prev.filter(
          (created) =>
            !mapped.some((live) => live.hostedByMe && live.title === created.title && live.source === "user"),
        );
        setSelectedId((current) => {
          const replaced = prev.find((created) => created.id === current);
          if (!replaced) return current;
          const live = mapped.find(
            (event) => event.hostedByMe && event.title === replaced.title && event.source === "user",
          );
          return live?.id ?? current;
        });
        return remaining;
      });
    } catch {
      // Seeded student events still fill User Led Events if the API is down.
    }
  }, [campusId, userId]);

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

  const searching = query.trim().length > 0;

  const visibleEvents = useMemo(() => {
    if (sidebarFilter === "trending") {
      const trending = pickTrendingEvents(events, { campusId, rejected, going });
      if (!searching) return trending;
      return trending.filter((event) => matchesQuery(event, query));
    }
    return events.filter((event) => {
      if (rejected.has(event.id)) return searching && matchesQuery(event, query);
      if (!matchesQuery(event, query)) return false;
      if (sidebarFilter === "saved") return saved.has(event.id);
      if (sidebarFilter === "tbd") {
        return event.locationKind === "tbd" && sharesCampusMap(eventCampusId(event), campusId);
      }
      if (sidebarFilter === "remote") {
        return event.locationKind === "remote" && sharesCampusMap(eventCampusId(event), campusId);
      }
      if (sidebarFilter === "userLed") {
        return isUserLedEvent(event, userName) && sharesCampusMap(eventCampusId(event), campusId);
      }
      if (event.locationKind === "tbd" || event.locationKind === "remote") return false;
      if (!sharesCampusMap(eventCampusId(event), campusId)) return false;
      if (categoryFilter !== "all" && event.category !== categoryFilter) return false;
      if (dateFilter === "today" && !isEventToday(event)) return false;
      return true;
    });
  }, [events, query, searching, rejected, going, sidebarFilter, saved, categoryFilter, dateFilter, userName, campusId]);

  const searchResults = useMemo(
    () => events.filter((event) => matchesQuery(event, query)),
    [events, query],
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

  const rejectEvent = useCallback((id: string) => {
    setRejected((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setGoing((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSaved((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const restoreEvent = useCallback((id: string) => {
    setRejected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const createEvent = useCallback(
    (draft: EventDraft, hostName = "You", eventCampusIdValue: CampusId = campusId): CampusEvent | null => {
      const remote = draft.locationKind === "remote";
      if (!remote && !draft.point) return null;
      const point = draft.point ?? getCampus(eventCampusIdValue).spec.home;
      const geo = campusMapToGeo(point, eventCampusIdValue);
      const style = CATEGORY_STYLE[draft.category];
      const start = dateTodayAt(draft.startTime);
      const end = dateTodayAt(draft.endTime);
      if (end <= start) end.setDate(end.getDate() + 1);
      const event: CampusEvent = {
        id: `temp-${Date.now()}`,
        title: draft.title.trim(),
        category: draft.category,
        locationName: draft.locationName.trim() || (remote ? "Virtual" : "Pinned location"),
        address: draft.locationName.trim() || (remote ? "Online event" : "Pinned on the campus map"),
        description: draft.description.trim() || "No description provided.",
        mapX: point.x,
        mapY: point.y,
        distance: remote ? "Remote" : "On campus",
        timeStatus: timeStatusFromDates(start, end),
        startTime: formatClock(draft.startTime),
        endTime: formatClock(draft.endTime),
        dateLabel: dateLabelFrom(start),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        goingCount: 0,
        interestedCount: 0,
        host: hostName,
        markerColor: style.markerColor,
        iconType: style.iconType,
        isTemporary: true,
        locationKind: remote ? "remote" : "mapped",
        source: "user",
        hostedByMe: true,
        campusId: eventCampusIdValue,
        latitude: geo.lat,
        longitude: geo.lng,
        images: draft.images ?? [],
        primaryImageUrl: draft.images?.find((image) => image.isPrimary)?.url ?? draft.images?.[0]?.url,
      };
      setCreatedEvents((prev) => [...prev, event]);
      setSelectedId(event.id);
      setDrawerOpen(true);
      syncUrl(event);
      return event;
    },
    [campusId],
  );

  const updateUserEventImages = useCallback((eventId: string, images: CampusEvent["images"]) => {
    const list = images ?? [];
    const primaryImageUrl = list.find((image) => image.isPrimary)?.url ?? list[0]?.url;
    const patch = (event: CampusEvent) =>
      event.id === eventId ? { ...event, images: list, primaryImageUrl } : event;
    setCreatedEvents((prev) => prev.map(patch));
    setCommunityEvents((prev) => prev.map(patch));
  }, []);

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
    searchResults,
    selectedEvent,
    drawerOpen,
    selectEvent,
    closeDrawer,
    going,
    toggleGoing,
    saved,
    toggleSaved,
    rejected,
    rejectEvent,
    restoreEvent,
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
    updateUserEventImages,
    toast,
    showToast,
    dismissToast: () => setToast(null),
    liveStatus,
    tbdCount: events.filter(
      (event) =>
        event.locationKind === "tbd" &&
        !rejected.has(event.id) &&
        sharesCampusMap(eventCampusId(event), campusId),
    ).length,
    remoteCount: events.filter(
      (event) =>
        event.locationKind === "remote" &&
        !rejected.has(event.id) &&
        sharesCampusMap(eventCampusId(event), campusId),
    ).length,
    userLedCount: events.filter(
      (event) =>
        isUserLedEvent(event, userName) &&
        !rejected.has(event.id) &&
        sharesCampusMap(eventCampusId(event), campusId),
    ).length,
    refreshLiveEvents,
  };
}

export type CampusState = ReturnType<typeof useCampusState>;
