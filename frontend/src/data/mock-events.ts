import type { CampusEvent } from "@/types/event";

/**
 * Mock campus events for the Phase 1 visual prototype.
 *
 * `mapX` / `mapY` are normalised percentages of the placeholder map surface
 * (the pin tip, not the pin centre) rather than geographic coordinates, so the
 * markers keep their composition at any viewport size. Phase 2 replaces these
 * with real lng/lat once Mapbox is wired in.
 */
export const MOCK_EVENTS: CampusEvent[] = [];

/** No built-in event is pre-selected; the map starts empty. */
export const FEATURED_EVENT_ID = "";

/** Bottom status bar figures shown over the map. */
export const CAMPUS_STATS = {
  happeningNow: 0,
  activeOnCampus: 0,
  freeFoodEvents: 0,
} as const;
