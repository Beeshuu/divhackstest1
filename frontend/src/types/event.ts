/**
 * Core domain types for Campus Connect.
 *
 * Phase 1 is presentation-only: these shapes exist so the visual prototype has
 * realistic data, and so a later backend can return the same structure.
 */

export type EventCategory =
  | "Free Food"
  | "Social"
  | "Academic"
  | "Career"
  | "Sports"
  | "Entertainment";

/** Which category palette an event marker and its badges use. */
export type MarkerColor =
  | "coral"
  | "pink"
  | "blue"
  | "orange"
  | "green"
  | "purple"
  | "teal";

/** Lucide icon slot rendered inside a map marker. */
export type MarkerIcon =
  | "pizza"
  | "music"
  | "book"
  | "briefcase"
  | "graduation"
  | "run"
  | "users";

export interface CampusEvent {
  id: string;
  title: string;
  category: EventCategory;
  locationName: string;
  address: string;
  description: string;
  /** Horizontal position on the campus map, 0–100 (% of map width). */
  mapX: number;
  /** Vertical position on the campus map, 0–100 (% of map height). */
  mapY: number;
  distance: string;
  timeStatus: string;
  startTime: string;
  endTime: string;
  dateLabel: string;
  goingCount: number;
  interestedCount: number;
  host: string;
  markerColor: MarkerColor;
  iconType: MarkerIcon;
}
