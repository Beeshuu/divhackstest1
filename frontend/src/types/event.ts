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
  /** ISO start used to decide whether the event is today. */
  startsAt?: string;
  /** ISO end used for reminders and “ended” checks. */
  endsAt?: string;
  goingCount: number;
  interestedCount: number;
  host: string;
  markerColor: MarkerColor;
  iconType: MarkerIcon;
  /** Phrase in `description` rendered in bold, as in the reference drawer. */
  emphasis?: string;
  /**
   * Created in this browser session only. Temporary events vanish on refresh and
   * have no public URL until server persistence exists.
   */
  isTemporary?: boolean;
  /** Live official-calendar listings: mapped campus pin, TBD, or remote. */
  locationKind?: "mapped" | "tbd" | "remote";
  sourceUrl?: string;
  source?: "university-life" | "user";
  /** True when the signed-in student posted this listing. */
  hostedByMe?: boolean;
  /** Which illustrated campus this pin belongs on. Defaults to Columbia. */
  campusId?: string;
  latitude?: number;
  longitude?: number;
  /** Host-uploaded photos. Only student-posted (User Led) events use these. */
  images?: EventImage[];
  /** First/primary photo, used as the User Led map pin. */
  primaryImageUrl?: string;
}

export interface EventImage {
  id?: number | string;
  url: string;
  isPrimary?: boolean;
}

/** Sidebar selection: a category, every event, or the user's saved events. */
export type SidebarFilter = "all" | "trending" | "saved" | "tbd" | "remote" | "userLed";

/** Single-select view pills floating over the map. */
export type MapPill = "trending";

export type DateFilter = "today" | "any";

/** Form state for the Post Event modal. */
export interface EventDraft {
  title: string;
  description: string;
  category: EventCategory;
  locationName: string;
  startTime: string;
  endTime: string;
  /** Pin position on the campus map in %, set via "Choose on map". */
  point: { x: number; y: number } | null;
  /** Host photos for this User Led post. The first one is the map marker. */
  images: EventImage[];
}
