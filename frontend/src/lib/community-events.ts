import { campusIdFromLatLng, geoToCampusMap } from "@/lib/campuses";
import { CATEGORY_STYLE, EVENT_CATEGORIES } from "@/lib/constants";
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
  images?: Array<{ id?: number; url: string; isPrimary?: boolean }>;
}

export function communityEventNumericId(eventId: string): string | null {
  const match = /^user-(\d+)$/.exec(eventId);
  return match?.[1] ?? null;
}

export function communityEventFromApi(row: ApiEventRow, myUserId?: number): CampusEvent | null {
  if (!EVENT_CATEGORIES.includes(row.category as EventCategory)) return null;
  const start = new Date(row.starts_at);
  const end = new Date(row.closes_at);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= new Date()) return null;
  const latlng = { lat: row.latitude, lng: row.longitude };
  const campusId = campusIdFromLatLng(latlng) ?? "columbia";
  const point = geoToCampusMap(latlng, campusId);
  const category = row.category as EventCategory;
  const style = CATEGORY_STYLE[category];
  const images = Array.isArray(row.images)
    ? row.images.filter((image) => typeof image?.url === "string" && image.url.length > 0)
    : [];
  return {
    id: `user-${row.id}`,
    title: row.title,
    category,
    locationName: row.location_name || "Pinned location",
    address: row.address || row.location_name || "Pinned on the campus map",
    description: row.description || "Posted by a student on Campus Connect.",
    mapX: point.x,
    mapY: point.y,
    campusId,
    latitude: row.latitude,
    longitude: row.longitude,
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
    images,
    primaryImageUrl: images.find((image) => image.isPrimary)?.url ?? images[0]?.url,
  };
}
