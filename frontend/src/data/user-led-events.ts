import { CATEGORY_STYLE } from "@/lib/constants";
import { clockLabel, dateLabelFrom, timeStatusFromDates } from "@/lib/utils";
import type { CampusEvent, EventCategory } from "@/types/event";

function offsetEvent({
  id,
  title,
  category,
  locationName,
  address,
  description,
  host,
  mapX,
  mapY,
  startOffsetMin,
  durationMin,
  goingCount,
}: {
  id: string;
  title: string;
  category: EventCategory;
  locationName: string;
  address: string;
  description: string;
  host: string;
  mapX: number;
  mapY: number;
  startOffsetMin: number;
  durationMin: number;
  goingCount: number;
}): CampusEvent {
  const start = new Date(Date.now() + startOffsetMin * 60 * 1000);
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const style = CATEGORY_STYLE[category];
  return {
    id,
    title,
    category,
    locationName,
    address,
    description,
    mapX,
    mapY,
    distance: "On campus",
    timeStatus: timeStatusFromDates(start, end),
    startTime: clockLabel(start),
    endTime: clockLabel(end),
    dateLabel: dateLabelFrom(start),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    goingCount,
    interestedCount: Math.max(2, goingCount - 1),
    host,
    markerColor: style.markerColor,
    iconType: style.iconType,
    locationKind: "mapped",
    source: "user",
    campusId: "columbia",
  };
}

/** Student-posted listings so User Led Events has real campus events to open. */
export const USER_LED_EVENTS: CampusEvent[] = [
  offsetEvent({
    id: "user-led-study-group",
    title: "Butler night study group",
    category: "Academic",
    locationName: "Butler Library",
    address: "Butler Library, 535 W. 114th St",
    description:
      "Maya is hosting a quiet group at Butler for anyone grinding through readings or problem sets. Bring your own work, grab a seat near the 3rd-floor lobby, and stay as long as you need. Snacks are first come, first served.",
    host: "Maya Chen",
    mapX: 53.2,
    mapY: 63.1,
    startOffsetMin: 12,
    durationMin: 90,
    goingCount: 6,
  }),
  offsetEvent({
    id: "user-led-lawn-hang",
    title: "South Field sunset hang",
    category: "Social",
    locationName: "South Field",
    address: "South Field, Columbia campus",
    description:
      "Jordan is putting out a blanket on South Field for a low-key hang after classes. Come meet other undergrads, toss a frisbee, or just sit in the sun. No RSVP — show up whenever.",
    host: "Jordan Alvarez",
    mapX: 56.8,
    mapY: 55.6,
    startOffsetMin: 110,
    durationMin: 90,
    goingCount: 11,
  }),
  offsetEvent({
    id: "user-led-resume-review",
    title: "Peer resume review",
    category: "Career",
    locationName: "Lerner Hall",
    address: "Lerner Hall, 2920 Broadway",
    description:
      "Priya is running a drop-in resume review for students applying this week. Bring a printed or laptop copy and get a 15-minute pass from another student who just finished recruiting. First ten people get a full read.",
    host: "Priya Shah",
    mapX: 41.8,
    mapY: 63.1,
    startOffsetMin: 180,
    durationMin: 75,
    goingCount: 4,
  }),
  offsetEvent({
    id: "user-led-soccer",
    title: "Pickup soccer at John Jay",
    category: "Sports",
    locationName: "John Jay Hall",
    address: "John Jay Hall, 519 W. 114th St",
    description:
      "Alex is organizing a casual pickup game beside John Jay. All skill levels are welcome and teams will be split on the spot. Bring a water bottle; pinnies are provided.",
    host: "Alex Kim",
    mapX: 64.4,
    mapY: 63.1,
    startOffsetMin: 24 * 60 + 90,
    durationMin: 60,
    goingCount: 8,
  }),
];

export function isOwnUserEvent(event: CampusEvent, userName?: string | null): boolean {
  if (event.source !== "user") return false;
  if (event.hostedByMe || event.host === "You") return true;
  return Boolean(userName && event.host === userName);
}

export function isUserLedEvent(event: CampusEvent, userName?: string | null): boolean {
  return event.source === "user" && !isOwnUserEvent(event, userName);
}
