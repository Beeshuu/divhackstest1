/**
 * Maps real GPS coordinates onto the illustrated Morningside Heights map.
 *
 * The drawing uses the same convention as Columbia's printed maps: avenues
 * run vertical, streets run horizontal, covering 110th–122nd Street from
 * Riverside Drive to Morningside Drive. Google/Apple Maps use true north, so
 * Broadway slants relative to Amsterdam. Inverse-distance weighting across
 * the real intersections absorbs that slant and drops pins on the matching
 * block of the illustration.
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

/** Pixel size of the illustrated campus SVG (`CampusMapArt`). */
export const MAP_ART = {
  width: 810,
  height: 1048,
} as const;

/** Street and avenue crossings shared by the illustration and the projection. */
export const PLAN = {
  x: {
    riverside: 12.1,
    claremont: 23.83,
    broadway: 36.42,
    amsterdam: 69.51,
    morningside: 89.75,
  },
  y: {
    122: 5.53,
    121: 12.21,
    120: 19.94,
    119: 27.58,
    118: 35.11,
    116: 51.29,
    115: 59.64,
    114: 66.6,
    113: 74.71,
    112: 81.68,
    111: 89.31,
    110: 96.95,
  },
} as const;

export interface ControlPoint extends LatLng, MapPoint {}

/**
 * Google/Apple positions for the labelled crossings on the plan.
 * Intermediate blocks are spaced from those measured corners.
 */
export const COLUMBIA_CONTROLS: ControlPoint[] = [
  { lat: 40.80385, lng: -73.96675, x: PLAN.x.broadway, y: PLAN.y[110] },
  { lat: 40.80455, lng: -73.96635, x: PLAN.x.broadway, y: PLAN.y[111] },
  { lat: 40.80525, lng: -73.96595, x: PLAN.x.broadway, y: PLAN.y[112] },
  { lat: 40.80595, lng: -73.96555, x: PLAN.x.broadway, y: PLAN.y[113] },
  { lat: 40.80655, lng: -73.96515, x: PLAN.x.broadway, y: PLAN.y[114] },
  { lat: 40.80725, lng: -73.96475, x: PLAN.x.broadway, y: PLAN.y[115] },
  { lat: 40.80798, lng: -73.96415, x: PLAN.x.broadway, y: PLAN.y[116] },
  { lat: 40.80915, lng: -73.96335, x: PLAN.x.broadway, y: PLAN.y[118] },
  { lat: 40.80975, lng: -73.96295, x: PLAN.x.broadway, y: PLAN.y[119] },
  { lat: 40.81035, lng: -73.96185, x: PLAN.x.broadway, y: PLAN.y[120] },
  { lat: 40.81105, lng: -73.96145, x: PLAN.x.broadway, y: PLAN.y[121] },
  { lat: 40.81175, lng: -73.96105, x: PLAN.x.broadway, y: PLAN.y[122] },
  { lat: 40.8033, lng: -73.96285, x: PLAN.x.amsterdam, y: PLAN.y[110] },
  { lat: 40.804, lng: -73.96245, x: PLAN.x.amsterdam, y: PLAN.y[111] },
  { lat: 40.8047, lng: -73.96205, x: PLAN.x.amsterdam, y: PLAN.y[112] },
  { lat: 40.8054, lng: -73.96165, x: PLAN.x.amsterdam, y: PLAN.y[113] },
  { lat: 40.806, lng: -73.96125, x: PLAN.x.amsterdam, y: PLAN.y[114] },
  { lat: 40.8067, lng: -73.96085, x: PLAN.x.amsterdam, y: PLAN.y[115] },
  { lat: 40.80755, lng: -73.96005, x: PLAN.x.amsterdam, y: PLAN.y[116] },
  { lat: 40.8087, lng: -73.95925, x: PLAN.x.amsterdam, y: PLAN.y[118] },
  { lat: 40.80925, lng: -73.95885, x: PLAN.x.amsterdam, y: PLAN.y[119] },
  { lat: 40.8098, lng: -73.95755, x: PLAN.x.amsterdam, y: PLAN.y[120] },
  { lat: 40.8105, lng: -73.95715, x: PLAN.x.amsterdam, y: PLAN.y[121] },
  { lat: 40.8112, lng: -73.95675, x: PLAN.x.amsterdam, y: PLAN.y[122] },
  { lat: 40.8046, lng: -73.97015, x: PLAN.x.riverside, y: PLAN.y[110] },
  { lat: 40.8073, lng: -73.96855, x: PLAN.x.riverside, y: PLAN.y[114] },
  { lat: 40.80875, lng: -73.96755, x: PLAN.x.riverside, y: PLAN.y[116] },
  { lat: 40.8111, lng: -73.96525, x: PLAN.x.riverside, y: PLAN.y[120] },
  { lat: 40.8069, lng: -73.96685, x: PLAN.x.claremont, y: PLAN.y[114] },
  { lat: 40.80835, lng: -73.96585, x: PLAN.x.claremont, y: PLAN.y[116] },
  { lat: 40.8107, lng: -73.96355, x: PLAN.x.claremont, y: PLAN.y[120] },
  { lat: 40.8029, lng: -73.96005, x: PLAN.x.morningside, y: PLAN.y[110] },
  { lat: 40.8056, lng: -73.95845, x: PLAN.x.morningside, y: PLAN.y[114] },
  { lat: 40.80715, lng: -73.95725, x: PLAN.x.morningside, y: PLAN.y[116] },
  { lat: 40.8094, lng: -73.95475, x: PLAN.x.morningside, y: PLAN.y[120] },
];

const IDW_POWER = 2;

/** Inverse-distance weighting across a campus's measured street crossings. */
export function projectWithControls({ lat, lng }: LatLng, controls: ControlPoint[]): MapPoint {
  let x = 0;
  let y = 0;
  let weightSum = 0;
  for (const point of controls) {
    const distance = Math.hypot(lat - point.lat, lng - point.lng);
    if (distance < 1e-12) return { x: point.x, y: point.y };
    const weight = 1 / distance ** IDW_POWER;
    weightSum += weight;
    x += weight * point.x;
    y += weight * point.y;
  }
  return { x: x / weightSum, y: y / weightSum };
}

export function unprojectWithControls({ x, y }: MapPoint, controls: ControlPoint[]): LatLng {
  let lat = 0;
  let lng = 0;
  let weightSum = 0;
  for (const point of controls) {
    const distance = Math.hypot(x - point.x, y - point.y);
    if (distance < 1e-12) return { lat: point.lat, lng: point.lng };
    const weight = 1 / distance ** IDW_POWER;
    weightSum += weight;
    lat += weight * point.lat;
    lng += weight * point.lng;
  }
  return { lat: lat / weightSum, lng: lng / weightSum };
}

export function geoToMap(point: LatLng): MapPoint {
  return projectWithControls(point, COLUMBIA_CONTROLS);
}

export function mapToGeo(point: MapPoint): LatLng {
  return unprojectWithControls(point, COLUMBIA_CONTROLS);
}

/** True when a point falls on the drawn campus plan. */
export function isOnMap({ x, y }: MapPoint): boolean {
  return x >= 0 && x <= 100 && y >= 0 && y <= 100;
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Approximate walking time between two map points (~80 m per minute). */
export function walkingMinutes(a: MapPoint, b: MapPoint): number {
  return Math.max(1, Math.round(haversineMeters(mapToGeo(a), mapToGeo(b)) / 80));
}
