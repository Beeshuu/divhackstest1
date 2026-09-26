import { mapToGeo } from "./geo";
import type { CampusEvent } from "@/types/event";

/**
 * Standard Google Maps directions link — opened in a new tab, no maps SDK.
 * Built-in events route to their street address; events pinned in this session
 * route to the coordinates of their pin.
 */
export function directionsUrl(event: CampusEvent): string {
  const destination = event.isTemporary
    ? (() => {
        const { lat, lng } = mapToGeo({ x: event.mapX, y: event.mapY });
        return `${lat.toFixed(6)},${lng.toFixed(6)}`;
      })()
    : `${event.address}, New York, NY`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=walking`;
}
