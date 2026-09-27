import { CATEGORY_STYLE, EVENT_CATEGORIES } from "@/lib/constants";
import { geoToMap } from "@/lib/geo";
import { clockLabel, dateLabelFrom, timeStatusFromDates } from "@/lib/utils";
import type { CampusEvent, EventCategory } from "@/types/event";

interface ApiEventRow {
  id: number;
  title: string;
  category: string;
  description: string;
  location_name: string;
  address: string;
  host: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  closes_at: string;
  joined_count?: number;
  created_by?: number;
}

export function communityEventFromApi(row: ApiEventRow, myUserId?: number): CampusEvent | null {
  if (!EVENT_CATEGORIES.includes(row.category as EventCategory)) return null;
  const start = new Date(row.starts_at);
  const end = new Date(row.closes_at);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= new Date()) return null;
  const point = geoToMap({ lat: row.latitude, lng: row.longitude });
  const category = row.category as EventCategory;
  const style = CATEGORY_STYLE[category];
  return {
    id: `user-${row.id}`,
    title: row.title,
    category,
    locationName: row.location_name || "Pinned location",
    address: row.address || row.location_name || "Pinned on the campus map",
    description: row.description || "Posted by a student on Campus Connect.",
    mapX: point.x,
    mapY: point.y,
    distance: "On campus",
    timeStatus: timeStatusFromDates(start, end),
    startTime: clockLabel(start),
    endTime: clockLabel(end),
    dateLabel: dateLabelFrom(start),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    goingCount: Number(row.joined_count) || 0,
    interestedCount: 0,
    host: row.host || "Campus student",
    markerColor: style.markerColor,
    iconType: style.iconType,
    locationKind: "mapped",
    source: "user",
    hostedByMe: myUserId != null && row.created_by === myUserId,
  };
}
