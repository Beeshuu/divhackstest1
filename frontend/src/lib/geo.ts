/**
 * Maps real coordinates onto the stylised campus map and back.
 *
 * The placeholder map is drawn in "Manhattan grid" orientation: streets run
 * left–right, avenues top–bottom. The real grid is rotated ~29° east of true
 * north, so positions are projected onto the avenue/street axes and scaled by
 * the map's own block spacing (Broadway→Amsterdam, W 116th→W 113th).
 *
 * This is an approximation for a hand-drawn map. Phase 2 (Mapbox) replaces it
 * with a real projection.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPoint {
  /** % of map width */
  x: number;
  /** % of map height */
  y: number;
}

/** Broadway & W 116th St, where the map's Broadway and 116th labels cross. */
const ORIGIN_GEO: LatLng = { lat: 40.80797, lng: -73.96391 };
const ORIGIN_MAP: MapPoint = { x: 12.2, y: 11.2 };

const GRID_BEARING = (29 * Math.PI) / 180;
const METERS_PER_DEG_LAT = 111_320;
const METERS_PER_DEG_LNG = METERS_PER_DEG_LAT * Math.cos((ORIGIN_GEO.lat * Math.PI) / 180);

/** Broadway → Amsterdam Ave is ~290 m and spans 80% of the map width. */
const CROSSTOWN_METERS_PER_PCT = 290 / 80;
/** One street block is ~80 m and spans ~24.9% of the map height. */
const UPTOWN_METERS_PER_PCT = 80 / 24.9;

export function geoToMap({ lat, lng }: LatLng): MapPoint {
  const north = (lat - ORIGIN_GEO.lat) * METERS_PER_DEG_LAT;
  const east = (lng - ORIGIN_GEO.lng) * METERS_PER_DEG_LNG;
  const uptown = north * Math.cos(GRID_BEARING) + east * Math.sin(GRID_BEARING);
  const crosstown = -north * Math.sin(GRID_BEARING) + east * Math.cos(GRID_BEARING);
  return {
    x: ORIGIN_MAP.x + crosstown / CROSSTOWN_METERS_PER_PCT,
    y: ORIGIN_MAP.y - uptown / UPTOWN_METERS_PER_PCT,
  };
}

export function mapToGeo({ x, y }: MapPoint): LatLng {
  const crosstown = (x - ORIGIN_MAP.x) * CROSSTOWN_METERS_PER_PCT;
  const uptown = (ORIGIN_MAP.y - y) * UPTOWN_METERS_PER_PCT;
  const north = uptown * Math.cos(GRID_BEARING) - crosstown * Math.sin(GRID_BEARING);
  const east = uptown * Math.sin(GRID_BEARING) + crosstown * Math.cos(GRID_BEARING);
  return {
    lat: ORIGIN_GEO.lat + north / METERS_PER_DEG_LAT,
    lng: ORIGIN_GEO.lng + east / METERS_PER_DEG_LNG,
  };
}

/** True when a point falls on the drawn campus area. */
export function isOnMap({ x, y }: MapPoint): boolean {
  return x >= 0 && x <= 100 && y >= 0 && y <= 100;
}

/** Approximate walking time between two map points (~80 m per minute). */
export function walkingMinutes(a: MapPoint, b: MapPoint): number {
  const dx = (a.x - b.x) * CROSSTOWN_METERS_PER_PCT;
  const dy = (a.y - b.y) * UPTOWN_METERS_PER_PCT;
  return Math.max(1, Math.round(Math.hypot(dx, dy) / 80));
}
