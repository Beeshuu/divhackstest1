import { campusMapToGeo, type CampusId } from "./campuses";
import { type LatLng } from "./geo";
import type { CampusEvent } from "@/types/event";

function destinationFor(event: CampusEvent): string {
  if (event.latitude != null && event.longitude != null) {
    return `${event.latitude.toFixed(6)},${event.longitude.toFixed(6)}`;
  }
  if (event.isTemporary) {
    const campusId = (event.campusId as CampusId | undefined) ?? "columbia";
    const { lat, lng } = campusMapToGeo({ x: event.mapX, y: event.mapY }, campusId);
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  }
  return `${event.address}, New York, NY`;
}

function originParam(origin?: LatLng | null): string {
  return origin ? `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}` : "";
}

/** Walking directions in Google Maps. */
export function googleDirectionsUrl(event: CampusEvent, origin?: LatLng | null): string {
  const params = new URLSearchParams({
    api: "1",
    destination: destinationFor(event),
    travelmode: "walking",
  });
  const from = originParam(origin);
  if (from) params.set("origin", from);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Walking directions in Apple Maps. */
export function appleDirectionsUrl(event: CampusEvent, origin?: LatLng | null): string {
  const params = new URLSearchParams({
    daddr: destinationFor(event),
    dirflg: "w",
  });
  const from = originParam(origin);
  if (from) params.set("saddr", from);
  return `https://maps.apple.com/?${params.toString()}`;
}

/** @deprecated Prefer googleDirectionsUrl — kept for any leftover callers. */
export function directionsUrl(event: CampusEvent, origin?: LatLng | null): string {
  return googleDirectionsUrl(event, origin);
}
