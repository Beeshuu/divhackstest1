import type { MapBuildingLabel, MapStreetLabel } from "@/lib/constants";
import { MAP_LABELS } from "@/lib/constants";
import { COLLEGES } from "@/lib/colleges";
import {
  MAP_ART,
  PLAN,
  projectWithControls,
  unprojectWithControls,
  type ControlPoint,
  type LatLng,
  type MapPoint,
} from "@/lib/geo";

export type CampusId =
  | "columbia"
  | "barnard"
  | "nyu"
  | "newschool"
  | "fordham"
  | "pace"
  | "cooper"
  | "baruch"
  | "ccny"
  | "hunter"
  | "brooklyn"
  | "queens"
  | "stjohns"
  | "stevens";

export interface GeoBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface CampusBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  alt?: boolean;
  rx?: number;
}

export interface CampusTree {
  x: number;
  y: number;
  r: number;
  tone: number;
}

export interface AvenueSpec {
  name: string;
  x: number;
  wide?: boolean;
  minor?: boolean;
}

export interface StreetSpec {
  name: string;
  y: number;
  minor?: boolean;
}

export type MapArtKind = "columbia" | "illustrated";

export interface CampusSpec {
  id: CampusId;
  name: string;
  ariaLabel: string;
  home: MapPoint;
  artKind: MapArtKind;
  crown?: MapPoint;
  avenues: AvenueSpec[];
  streets: StreetSpec[];
  lawns: CampusBlock[];
  walks?: CampusBlock[];
  /** Cells skipped for buildings — [avenue index, street index] of the north-west corner. */
  skipCells?: Array<[number, number]>;
  featured: MapBuildingLabel[];
  seed: number;
  controls: ControlPoint[];
  bounds: GeoBounds;
}

export interface IllustratedLayout {
  buildings: CampusBlock[];
  trees: CampusTree[];
}

export interface CampusDefinition {
  spec: CampusSpec;
  layout: IllustratedLayout;
  labels: {
    buildings: MapBuildingLabel[];
    streets: MapStreetLabel[];
  };
}

function rngFrom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function boundsFromControls(controls: ControlPoint[], pad = 0.0022): GeoBounds {
  return {
    south: Math.min(...controls.map((point) => point.lat)) - pad,
    north: Math.max(...controls.map((point) => point.lat)) + pad,
    west: Math.min(...controls.map((point) => point.lng)) - pad,
    east: Math.max(...controls.map((point) => point.lng)) + pad,
  };
}

function streetLabels(avenues: AvenueSpec[], streets: StreetSpec[]): MapStreetLabel[] {
  return [
    ...streets.map((street) => ({
      label: street.name,
      x: 50,
      y: street.y,
      rotate: 0,
      minor: street.minor,
    })),
    ...avenues.map((avenue) => ({
      label: avenue.name,
      x: avenue.x,
      y: 42,
      rotate: 90,
      minor: avenue.minor,
    })),
  ];
}

function fillCell(
  west: number,
  east: number,
  north: number,
  south: number,
  rand: () => number,
  altStart: boolean,
): CampusBlock[] {
  const padX = 1.15;
  const padY = 1.05;
  const x = west + padX;
  const y = north + padY;
  const w = Math.max(3, east - west - padX * 2);
  const h = Math.max(3, south - north - padY * 2);
  const cols = w > 28 ? 4 : w > 18 ? 3 : w > 9 ? 2 : 1;
  const rows = h > 22 ? 3 : h > 12 ? 2 : 1;
  const gapX = cols > 1 ? 0.7 : 0;
  const gapY = rows > 1 ? 0.65 : 0;
  const cellW = (w - gapX * (cols - 1)) / cols;
  const cellH = (h - gapY * (rows - 1)) / rows;
  const blocks: CampusBlock[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const inset = 0.05 + rand() * 0.07;
      const left = x + col * (cellW + gapX) + cellW * inset * 0.35;
      const top = y + row * (cellH + gapY) + cellH * inset * 0.25;
      const width = cellW * (1 - inset);
      const height = cellH * (1 - inset * 0.85);
      blocks.push({
        x: left,
        y: top,
        w: width,
        h: height,
        alt: ((row + col) % 2 === 0) === altStart,
        rx: rand() > 0.82 ? 1.4 : 0.55,
      });
    }
  }
  return blocks;
}

function buildLayout(spec: CampusSpec): IllustratedLayout {
  const rand = rngFrom(spec.seed);
  const buildings: CampusBlock[] = [];
  const skipped = new Set((spec.skipCells ?? []).map(([a, s]) => `${a}-${s}`));

  for (let a = 0; a < spec.avenues.length - 1; a++) {
    for (let s = 0; s < spec.streets.length - 1; s++) {
      if (skipped.has(`${a}-${s}`)) continue;
      const west = spec.avenues[a].x;
      const east = spec.avenues[a + 1].x;
      const north = spec.streets[s].y;
      const south = spec.streets[s + 1].y;
      if (east - west < 6 || south - north < 5) continue;
      buildings.push(...fillCell(west, east, north, south, rand, (a + s) % 2 === 0));
    }
  }

  const trees: CampusTree[] = [];
  const lanes: Array<[number, number, number, number]> = [];
  for (const avenue of spec.avenues) {
    lanes.push([avenue.x - 2.4, 6, avenue.x - 2.4, 94]);
    lanes.push([avenue.x + 2.4, 6, avenue.x + 2.4, 94]);
  }
  for (const street of spec.streets) {
    lanes.push([6, street.y, 94, street.y]);
  }
  for (const lawn of spec.lawns) {
    lanes.push([lawn.x + 2, lawn.y + 2, lawn.x + lawn.w - 2, lawn.y + 2]);
    lanes.push([lawn.x + 2, lawn.y + lawn.h - 2, lawn.x + lawn.w - 2, lawn.y + lawn.h - 2]);
  }
  lanes.push([3, 8, 3, 92], [97, 8, 97, 92]);

  for (const [x0, y0, x1, y1] of lanes) {
    const length = Math.hypot(x1 - x0, y1 - y0);
    const count = Math.max(3, Math.round(length / 7.5));
    for (let i = 0; i < count; i++) {
      if (rand() < 0.34) continue;
      const t = (i + 0.5) / count;
      trees.push({
        x: x0 + (x1 - x0) * t + (rand() - 0.5) * 1.6,
        y: y0 + (y1 - y0) * t + (rand() - 0.5) * 1.4,
        r: 0.62 + rand() * 0.5,
        tone: rand(),
      });
    }
  }

  return { buildings, trees };
}

function defineCampus(spec: CampusSpec): CampusDefinition {
  return {
    spec,
    layout: spec.artKind === "illustrated" ? buildLayout(spec) : { buildings: [], trees: [] },
    labels: {
      buildings: spec.featured,
      streets: spec.artKind === "columbia" ? MAP_LABELS.streets : streetLabels(spec.avenues, spec.streets),
    },
  };
}

const COLUMBIA_CONTROLS: ControlPoint[] = [
  { lat: 40.80385, lng: -73.96675, x: PLAN.x.broadway, y: PLAN.y[110] },
  { lat: 40.80798, lng: -73.96415, x: PLAN.x.broadway, y: PLAN.y[116] },
  { lat: 40.81175, lng: -73.96105, x: PLAN.x.broadway, y: PLAN.y[122] },
  { lat: 40.8033, lng: -73.96285, x: PLAN.x.amsterdam, y: PLAN.y[110] },
  { lat: 40.80755, lng: -73.96005, x: PLAN.x.amsterdam, y: PLAN.y[116] },
  { lat: 40.8112, lng: -73.95675, x: PLAN.x.amsterdam, y: PLAN.y[122] },
  { lat: 40.8046, lng: -73.97015, x: PLAN.x.riverside, y: PLAN.y[110] },
  { lat: 40.80875, lng: -73.96755, x: PLAN.x.riverside, y: PLAN.y[116] },
  { lat: 40.8029, lng: -73.96005, x: PLAN.x.morningside, y: PLAN.y[110] },
  { lat: 40.80715, lng: -73.95725, x: PLAN.x.morningside, y: PLAN.y[116] },
];

const columbiaSpec: CampusSpec = {
  id: "columbia",
  name: "Columbia University",
  ariaLabel:
    "Illustrated map of Columbia University, Barnard College, and Teachers College in Morningside Heights, from 110th to 122nd Street between Riverside Drive and Morningside Drive.",
  home: { x: 52, y: 49 },
  artKind: "columbia",
  crown: { x: 52.4, y: 47.8 },
  avenues: [],
  streets: [],
  lawns: [],
  featured: MAP_LABELS.buildings,
  seed: 1,
  controls: COLUMBIA_CONTROLS,
  bounds: { south: 40.8036, west: -73.9669, north: 40.8168, east: -73.9505 },
};

const barnardSpec: CampusSpec = {
  ...columbiaSpec,
  id: "barnard",
  name: "Barnard College",
  home: { x: 30.1, y: 42 },
  crown: { x: 27.2, y: 46.4 },
};

function grid(
  partial: Omit<CampusSpec, "artKind" | "bounds" | "controls"> & {
    controls: ControlPoint[];
    bounds?: GeoBounds;
  },
): CampusSpec {
  return {
    ...partial,
    artKind: "illustrated",
    bounds: partial.bounds ?? boundsFromControls(partial.controls),
  };
}

const NYU = grid({
  id: "nyu",
  name: "New York University",
  ariaLabel: "Illustrated map of NYU around Washington Square, from 8th Street to Bleecker between Sixth Avenue and Lafayette.",
  home: { x: 40, y: 36 },
  seed: 20260411,
  avenues: [
    { name: "6th Ave", x: 14, minor: true },
    { name: "LaGuardia", x: 30, minor: true },
    { name: "University Pl", x: 50 },
    { name: "Broadway", x: 72 },
    { name: "Lafayette", x: 90, minor: true },
  ],
  streets: [
    { name: "W 8th St", y: 10, minor: true },
    { name: "Waverly Pl", y: 26 },
    { name: "W 4th St", y: 48 },
    { name: "Washington Pl", y: 66, minor: true },
    { name: "W 3rd St", y: 82 },
    { name: "Bleecker St", y: 96, minor: true },
  ],
  skipCells: [
    [0, 1],
    [1, 1],
  ],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 92, y: 0, w: 8, h: 100 },
    { x: 16, y: 28, w: 32, h: 18, rx: 10 },
  ],
  walks: [
    { x: 30, y: 34, w: 18, h: 2.2 },
    { x: 39, y: 30, w: 2.2, h: 14 },
  ],
  featured: [
    { label: "Washington Square Park", x: 32, y: 37 },
    { label: "Silver Center", x: 56, y: 37 },
    { label: "Bobst Library", x: 40, y: 57 },
    { label: "Vanderbilt Hall", x: 24, y: 57, minor: true },
    { label: "Kimmel Center", x: 24, y: 74 },
    { label: "Tisch / Stern", x: 62, y: 57 },
    { label: "Meyer Hall", x: 62, y: 74, minor: true },
    { label: "Goddard Hall", x: 80, y: 37, minor: true },
    { label: "Weinstein", x: 56, y: 18, minor: true },
  ],
  controls: [
    { lat: 40.7331, lng: -74.0006, x: 14, y: 10 },
    { lat: 40.7314, lng: -74.0011, x: 14, y: 48 },
    { lat: 40.7298, lng: -74.0018, x: 14, y: 82 },
    { lat: 40.7324, lng: -73.9973, x: 30, y: 26 },
    { lat: 40.7308, lng: -73.9975, x: 40, y: 37 },
    { lat: 40.7302, lng: -73.9956, x: 50, y: 48 },
    { lat: 40.7288, lng: -73.9959, x: 50, y: 82 },
    { lat: 40.7306, lng: -73.9926, x: 72, y: 10 },
    { lat: 40.7284, lng: -73.9942, x: 72, y: 48 },
    { lat: 40.7268, lng: -73.9948, x: 72, y: 82 },
    { lat: 40.7278, lng: -73.9936, x: 90, y: 48 },
    { lat: 40.7262, lng: -73.994, x: 90, y: 82 },
  ],
});

const NEW_SCHOOL = grid({
  id: "newschool",
  name: "The New School",
  ariaLabel: "Illustrated map of The New School around Fifth Avenue, from 16th Street to 11th Street.",
  home: { x: 48, y: 50 },
  seed: 20260412,
  avenues: [
    { name: "6th Ave", x: 16, minor: true },
    { name: "5th Ave", x: 48 },
    { name: "University Pl", x: 72 },
    { name: "Broadway", x: 90, minor: true },
  ],
  streets: [
    { name: "16th St", y: 10, minor: true },
    { name: "14th St", y: 30 },
    { name: "13th St", y: 50 },
    { name: "12th St", y: 70 },
    { name: "11th St", y: 90, minor: true },
  ],
  skipCells: [[2, 0]],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 74, y: 12, w: 18, h: 16, rx: 8 },
  ],
  featured: [
    { label: "University Center", x: 48, y: 50 },
    { label: "Parsons", x: 32, y: 50 },
    { label: "Alvin Johnson Hall", x: 48, y: 70 },
    { label: "66 W 12th", x: 32, y: 70, minor: true },
    { label: "Sheila Johnson Design", x: 64, y: 50, minor: true },
    { label: "Eugene Lang", x: 48, y: 30 },
    { label: "Union Square", x: 82, y: 20, minor: true },
  ],
  controls: [
    { lat: 40.7378, lng: -73.9966, x: 16, y: 10 },
    { lat: 40.7365, lng: -73.9972, x: 16, y: 30 },
    { lat: 40.735, lng: -73.9978, x: 16, y: 70 },
    { lat: 40.7372, lng: -73.9924, x: 48, y: 10 },
    { lat: 40.7358, lng: -73.9928, x: 48, y: 30 },
    { lat: 40.7344, lng: -73.9934, x: 48, y: 70 },
    { lat: 40.7364, lng: -73.9908, x: 72, y: 30 },
    { lat: 40.735, lng: -73.9914, x: 72, y: 70 },
    { lat: 40.7356, lng: -73.9896, x: 90, y: 30 },
    { lat: 40.7342, lng: -73.9902, x: 90, y: 70 },
  ],
});

const FORDHAM = grid({
  id: "fordham",
  name: "Fordham University",
  ariaLabel: "Illustrated map of Fordham's Rose Hill campus between Fordham Road and Southern Boulevard.",
  home: { x: 50, y: 44 },
  seed: 20260413,
  avenues: [
    { name: "3rd Ave", x: 14, minor: true },
    { name: "Bathgate", x: 34 },
    { name: "Campus Walk", x: 56, minor: true },
    { name: "Southern Blvd", x: 86 },
  ],
  streets: [
    { name: "Fordham Rd", y: 12 },
    { name: "Keating Walk", y: 30, minor: true },
    { name: "Edwards Parade", y: 50 },
    { name: "191st St", y: 70, minor: true },
    { name: "189th St", y: 90 },
  ],
  skipCells: [
    [1, 1],
    [1, 2],
  ],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 36, y: 32, w: 18, h: 36, rx: 10 },
    { x: 90, y: 0, w: 10, h: 100 },
  ],
  walks: [{ x: 42, y: 32, w: 6, h: 36 }],
  featured: [
    { label: "Edwards Parade", x: 45, y: 50 },
    { label: "Keating Hall", x: 45, y: 22 },
    { label: "Cunniffe House", x: 24, y: 40, minor: true },
    { label: "Duane Library", x: 68, y: 40 },
    { label: "Walsh Library", x: 68, y: 60 },
    { label: "Queens Court", x: 24, y: 60, minor: true },
    { label: "Hughes Hall", x: 45, y: 80 },
    { label: "Thebaud Hall", x: 68, y: 80, minor: true },
  ],
  controls: [
    { lat: 40.8628, lng: -73.8904, x: 14, y: 12 },
    { lat: 40.861, lng: -73.8912, x: 14, y: 50 },
    { lat: 40.8592, lng: -73.892, x: 14, y: 90 },
    { lat: 40.8622, lng: -73.8876, x: 34, y: 12 },
    { lat: 40.8614, lng: -73.8856, x: 50, y: 44 },
    { lat: 40.86, lng: -73.887, x: 34, y: 70 },
    { lat: 40.8616, lng: -73.8824, x: 86, y: 12 },
    { lat: 40.86, lng: -73.8832, x: 86, y: 50 },
    { lat: 40.8584, lng: -73.884, x: 86, y: 90 },
  ],
});

const PACE = grid({
  id: "pace",
  name: "Pace University",
  ariaLabel: "Illustrated map of Pace University's Civic Center campus near City Hall and the Brooklyn Bridge.",
  home: { x: 48, y: 42 },
  seed: 20260414,
  avenues: [
    { name: "Broadway", x: 16 },
    { name: "Park Row", x: 38 },
    { name: "Gold St", x: 62 },
    { name: "Pearl St", x: 86, minor: true },
  ],
  streets: [
    { name: "Frankfort St", y: 12, minor: true },
    { name: "Spruce St", y: 32 },
    { name: "Beekman St", y: 54 },
    { name: "Fulton St", y: 74 },
    { name: "John St", y: 92, minor: true },
  ],
  skipCells: [[0, 1]],
  lawns: [
    { x: 0, y: 0, w: 10, h: 100 },
    { x: 18, y: 34, w: 18, h: 18, rx: 8 },
  ],
  featured: [
    { label: "One Pace Plaza", x: 50, y: 42 },
    { label: "41 Park Row", x: 28, y: 42 },
    { label: "City Hall Park", x: 26, y: 62, minor: true },
    { label: "163 William", x: 74, y: 42 },
    { label: "Maria's Tower", x: 50, y: 64 },
    { label: "Student Union", x: 74, y: 64, minor: true },
  ],
  controls: [
    { lat: 40.7128, lng: -74.0082, x: 16, y: 12 },
    { lat: 40.7114, lng: -74.0076, x: 16, y: 54 },
    { lat: 40.7102, lng: -74.007, x: 16, y: 74 },
    { lat: 40.7118, lng: -74.0054, x: 38, y: 32 },
    { lat: 40.7112, lng: -74.0048, x: 50, y: 42 },
    { lat: 40.7104, lng: -74.0042, x: 38, y: 74 },
    { lat: 40.7116, lng: -74.003, x: 62, y: 32 },
    { lat: 40.7102, lng: -74.0036, x: 62, y: 74 },
    { lat: 40.7096, lng: -74.0022, x: 86, y: 54 },
    { lat: 40.7086, lng: -74.0028, x: 86, y: 74 },
  ],
});

const COOPER = grid({
  id: "cooper",
  name: "Cooper Union",
  ariaLabel: "Illustrated map of Cooper Union at Cooper Square, from 9th Street to 4th Street.",
  home: { x: 42, y: 48 },
  seed: 20260415,
  avenues: [
    { name: "Bowery", x: 16, minor: true },
    { name: "Cooper Sq", x: 40 },
    { name: "4th Ave", x: 64 },
    { name: "Lafayette", x: 88, minor: true },
  ],
  streets: [
    { name: "9th St", y: 12, minor: true },
    { name: "Astor Place", y: 32 },
    { name: "7th St", y: 52 },
    { name: "6th St", y: 72, minor: true },
    { name: "4th St", y: 92 },
  ],
  skipCells: [[1, 1]],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 42, y: 34, w: 20, h: 16, rx: 8 },
  ],
  featured: [
    { label: "Foundation Building", x: 40, y: 52 },
    { label: "41 Cooper Square", x: 40, y: 32 },
    { label: "Cooper Triangle", x: 52, y: 42 },
    { label: "30 Cooper Square", x: 64, y: 52, minor: true },
    { label: "Stuyvesant-Cooper", x: 64, y: 72, minor: true },
  ],
  controls: [
    { lat: 40.73, lng: -73.9922, x: 16, y: 12 },
    { lat: 40.7282, lng: -73.9928, x: 16, y: 52 },
    { lat: 40.726, lng: -73.9936, x: 16, y: 92 },
    { lat: 40.7296, lng: -73.9904, x: 40, y: 32 },
    { lat: 40.7282, lng: -73.9908, x: 42, y: 48 },
    { lat: 40.7268, lng: -73.9912, x: 40, y: 72 },
    { lat: 40.7298, lng: -73.9892, x: 64, y: 32 },
    { lat: 40.7272, lng: -73.99, x: 64, y: 72 },
    { lat: 40.7298, lng: -73.9912, x: 88, y: 32 },
    { lat: 40.7274, lng: -73.992, x: 88, y: 72 },
  ],
});

const BARUCH = grid({
  id: "baruch",
  name: "CUNY — Baruch College",
  ariaLabel: "Illustrated map of Baruch College around Lexington Avenue between 26th and 22nd Street.",
  home: { x: 56, y: 50 },
  seed: 20260416,
  avenues: [
    { name: "Madison", x: 14, minor: true },
    { name: "Park Ave", x: 34 },
    { name: "Lexington", x: 58 },
    { name: "3rd Ave", x: 86 },
  ],
  streets: [
    { name: "26th St", y: 12, minor: true },
    { name: "25th St", y: 32 },
    { name: "24th St", y: 52 },
    { name: "23rd St", y: 72 },
    { name: "22nd St", y: 92, minor: true },
  ],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 48, y: 54, w: 18, h: 10, rx: 6 },
  ],
  featured: [
    { label: "Newman Vertical Campus", x: 58, y: 52 },
    { label: "Newman Library", x: 58, y: 32 },
    { label: "Field Building", x: 46, y: 72 },
    { label: "17 Lexington", x: 58, y: 72, minor: true },
    { label: "Information Bldg", x: 72, y: 52, minor: true },
    { label: "Admin Center", x: 34, y: 52, minor: true },
  ],
  controls: [
    { lat: 40.7424, lng: -73.9882, x: 14, y: 12 },
    { lat: 40.7408, lng: -73.9888, x: 14, y: 52 },
    { lat: 40.7394, lng: -73.9894, x: 14, y: 92 },
    { lat: 40.742, lng: -73.9862, x: 34, y: 12 },
    { lat: 40.7406, lng: -73.9868, x: 34, y: 52 },
    { lat: 40.7416, lng: -73.9836, x: 58, y: 12 },
    { lat: 40.7402, lng: -73.9842, x: 58, y: 52 },
    { lat: 40.7388, lng: -73.9848, x: 58, y: 92 },
    { lat: 40.7408, lng: -73.981, x: 86, y: 32 },
    { lat: 40.7394, lng: -73.9816, x: 86, y: 72 },
  ],
});

const CCNY = grid({
  id: "ccny",
  name: "CUNY — City College of New York",
  ariaLabel: "Illustrated map of City College in Harlem, from 141st Street to 130th Street along Convent Avenue.",
  home: { x: 48, y: 40 },
  seed: 20260417,
  avenues: [
    { name: "Amsterdam", x: 16 },
    { name: "Convent Ave", x: 48 },
    { name: "St Nicholas", x: 84 },
  ],
  streets: [
    { name: "141st St", y: 10, minor: true },
    { name: "140th St", y: 26 },
    { name: "138th St", y: 46 },
    { name: "135th St", y: 68 },
    { name: "133rd St", y: 86, minor: true },
  ],
  skipCells: [
    [0, 1],
    [1, 1],
  ],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 18, y: 28, w: 28, h: 16, rx: 10 },
    { x: 50, y: 28, w: 32, h: 16, rx: 10 },
    { x: 92, y: 0, w: 8, h: 100 },
  ],
  featured: [
    { label: "Shepard Hall", x: 48, y: 18 },
    { label: "The Great Lawn", x: 40, y: 36 },
    { label: "NAC", x: 32, y: 56 },
    { label: "Marshak Science", x: 66, y: 56 },
    { label: "Harris Hall", x: 32, y: 76, minor: true },
    { label: "Baskerville", x: 66, y: 76, minor: true },
    { label: "Wingate Hall", x: 48, y: 76 },
  ],
  controls: [
    { lat: 40.8218, lng: -73.9528, x: 16, y: 10 },
    { lat: 40.8198, lng: -73.9536, x: 16, y: 46 },
    { lat: 40.8176, lng: -73.9544, x: 16, y: 68 },
    { lat: 40.8214, lng: -73.9488, x: 48, y: 10 },
    { lat: 40.8198, lng: -73.9496, x: 48, y: 46 },
    { lat: 40.8178, lng: -73.9506, x: 48, y: 68 },
    { lat: 40.8216, lng: -73.9462, x: 84, y: 10 },
    { lat: 40.8196, lng: -73.947, x: 84, y: 46 },
    { lat: 40.8174, lng: -73.948, x: 84, y: 68 },
  ],
});

const HUNTER = grid({
  id: "hunter",
  name: "CUNY — Hunter College",
  ariaLabel: "Illustrated map of Hunter College on the Upper East Side, from 70th Street to 66th Street at Lexington Avenue.",
  home: { x: 48, y: 52 },
  seed: 20260418,
  avenues: [
    { name: "Park Ave", x: 16, minor: true },
    { name: "Lexington", x: 48 },
    { name: "3rd Ave", x: 84 },
  ],
  streets: [
    { name: "70th St", y: 12, minor: true },
    { name: "69th St", y: 32 },
    { name: "68th St", y: 54 },
    { name: "67th St", y: 74 },
    { name: "66th St", y: 92, minor: true },
  ],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 40, y: 50, w: 16, h: 6, rx: 5 },
  ],
  walks: [{ x: 40, y: 51, w: 16, h: 3.4 }],
  featured: [
    { label: "West Building", x: 32, y: 54 },
    { label: "East Building", x: 64, y: 54 },
    { label: "Thomas Hunter Hall", x: 48, y: 32 },
    { label: "Skywalk", x: 48, y: 52, minor: true },
    { label: "Assembly Hall", x: 32, y: 74, minor: true },
    { label: "68th Street campus", x: 64, y: 74 },
  ],
  controls: [
    { lat: 40.7702, lng: -73.9668, x: 16, y: 12 },
    { lat: 40.7688, lng: -73.9674, x: 16, y: 54 },
    { lat: 40.7674, lng: -73.968, x: 16, y: 92 },
    { lat: 40.7694, lng: -73.9638, x: 48, y: 12 },
    { lat: 40.7678, lng: -73.9644, x: 48, y: 54 },
    { lat: 40.7664, lng: -73.965, x: 48, y: 92 },
    { lat: 40.7686, lng: -73.9612, x: 84, y: 32 },
    { lat: 40.7672, lng: -73.9618, x: 84, y: 74 },
  ],
});

const BROOKLYN = grid({
  id: "brooklyn",
  name: "CUNY — Brooklyn College",
  ariaLabel: "Illustrated map of Brooklyn College in Midwood, around the Quad between Bedford Avenue and Nostrand Avenue.",
  home: { x: 50, y: 48 },
  seed: 20260419,
  avenues: [
    { name: "Ocean Ave", x: 12, minor: true },
    { name: "Campus Rd W", x: 30 },
    { name: "The Quad", x: 52, minor: true },
    { name: "Nostrand", x: 78 },
    { name: "Bedford", x: 92, minor: true },
  ],
  streets: [
    { name: "Avenue H", y: 12 },
    { name: "Campus Rd N", y: 32, minor: true },
    { name: "Quad Walk", y: 52 },
    { name: "Campus Rd S", y: 72, minor: true },
    { name: "Avenue I", y: 92 },
  ],
  skipCells: [
    [1, 1],
    [2, 1],
  ],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 32, y: 34, w: 44, h: 16, rx: 12 },
    { x: 94, y: 0, w: 6, h: 100 },
  ],
  walks: [
    { x: 50, y: 34, w: 3, h: 16 },
    { x: 32, y: 40, w: 44, h: 2.4 },
  ],
  featured: [
    { label: "The Quad", x: 50, y: 42 },
    { label: "LaGuardia Library", x: 50, y: 22 },
    { label: "Boylan Hall", x: 21, y: 42 },
    { label: "Ingersoll Hall", x: 65, y: 22 },
    { label: "Whitehead Hall", x: 21, y: 62, minor: true },
    { label: "James Hall", x: 65, y: 62 },
    { label: "Whitman Hall", x: 50, y: 82 },
    { label: "Roosevelt Hall", x: 85, y: 62, minor: true },
  ],
  controls: [
    { lat: 40.6324, lng: -73.9552, x: 12, y: 12 },
    { lat: 40.6308, lng: -73.9558, x: 12, y: 52 },
    { lat: 40.6294, lng: -73.9564, x: 12, y: 92 },
    { lat: 40.6318, lng: -73.9526, x: 30, y: 12 },
    { lat: 40.6308, lng: -73.9518, x: 50, y: 48 },
    { lat: 40.6298, lng: -73.9522, x: 30, y: 72 },
    { lat: 40.6316, lng: -73.9484, x: 78, y: 12 },
    { lat: 40.6302, lng: -73.949, x: 78, y: 52 },
    { lat: 40.6288, lng: -73.9496, x: 78, y: 92 },
    { lat: 40.6312, lng: -73.9536, x: 92, y: 52 },
  ],
});

const QUEENS = grid({
  id: "queens",
  name: "CUNY — Queens College",
  ariaLabel: "Illustrated map of Queens College in Flushing, around the Quad between Kissena Boulevard and Melbourne Avenue.",
  home: { x: 52, y: 48 },
  seed: 20260420,
  avenues: [
    { name: "Kissena Blvd", x: 14 },
    { name: "Reeves Ave", x: 40 },
    { name: "The Quad", x: 60, minor: true },
    { name: "Melbourne", x: 86 },
  ],
  streets: [
    { name: "65th Ave", y: 12, minor: true },
    { name: "Jesse Walk", y: 32 },
    { name: "Quad Walk", y: 52 },
    { name: "Melbourne Ave", y: 72 },
    { name: "LIE service", y: 92, minor: true },
  ],
  skipCells: [
    [1, 1],
    [2, 1],
  ],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 42, y: 34, w: 42, h: 16, rx: 10 },
    { x: 92, y: 0, w: 8, h: 100 },
  ],
  featured: [
    { label: "The Quad", x: 56, y: 42 },
    { label: "Rosenthal Library", x: 28, y: 32 },
    { label: "Powdermaker Hall", x: 56, y: 22 },
    { label: "Kiely Hall", x: 28, y: 52 },
    { label: "Remsen Hall", x: 72, y: 32 },
    { label: "Science Building", x: 72, y: 62 },
    { label: "Student Union", x: 56, y: 72 },
  ],
  controls: [
    { lat: 40.7384, lng: -73.8218, x: 14, y: 12 },
    { lat: 40.7367, lng: -73.8224, x: 14, y: 52 },
    { lat: 40.7352, lng: -73.823, x: 14, y: 92 },
    { lat: 40.7378, lng: -73.8196, x: 40, y: 12 },
    { lat: 40.7367, lng: -73.8203, x: 52, y: 48 },
    { lat: 40.7354, lng: -73.8208, x: 40, y: 72 },
    { lat: 40.7372, lng: -73.8172, x: 86, y: 32 },
    { lat: 40.7356, lng: -73.8178, x: 86, y: 72 },
  ],
});

const ST_JOHNS = grid({
  id: "stjohns",
  name: "St. John's University",
  ariaLabel: "Illustrated map of St. John's University in Queens, around Utopia Parkway and Union Turnpike.",
  home: { x: 50, y: 42 },
  seed: 20260421,
  avenues: [
    { name: "169th St", x: 14, minor: true },
    { name: "Utopia Pkwy", x: 42 },
    { name: "Campus Dr", x: 66, minor: true },
    { name: "178th St", x: 88 },
  ],
  streets: [
    { name: "Union Tpke", y: 12 },
    { name: "Great Lawn N", y: 32, minor: true },
    { name: "Campus Walk", y: 52 },
    { name: "82nd Ave", y: 74, minor: true },
    { name: "Grand Central", y: 92 },
  ],
  skipCells: [
    [1, 1],
    [2, 1],
  ],
  lawns: [
    { x: 0, y: 0, w: 8, h: 100 },
    { x: 44, y: 34, w: 40, h: 16, rx: 12 },
    { x: 94, y: 0, w: 6, h: 100 },
  ],
  featured: [
    { label: "Great Lawn", x: 56, y: 42 },
    { label: "St. Augustine Hall", x: 28, y: 32 },
    { label: "St. Thomas More", x: 56, y: 22 },
    { label: "D'Angelo Center", x: 56, y: 62 },
    { label: "Carnesecca Arena", x: 78, y: 32 },
    { label: "St. Albert Hall", x: 28, y: 62, minor: true },
    { label: "St. John Hall", x: 78, y: 62 },
  ],
  controls: [
    { lat: 40.7242, lng: -73.798, x: 14, y: 12 },
    { lat: 40.7224, lng: -73.7986, x: 14, y: 52 },
    { lat: 40.7208, lng: -73.7992, x: 14, y: 92 },
    { lat: 40.7238, lng: -73.7948, x: 42, y: 12 },
    { lat: 40.7218, lng: -73.7946, x: 50, y: 42 },
    { lat: 40.7206, lng: -73.7954, x: 42, y: 74 },
    { lat: 40.7234, lng: -73.7918, x: 88, y: 12 },
    { lat: 40.7214, lng: -73.7924, x: 88, y: 52 },
    { lat: 40.7198, lng: -73.793, x: 88, y: 92 },
  ],
});

const STEVENS = grid({
  id: "stevens",
  name: "Stevens Institute of Technology",
  ariaLabel: "Illustrated map of Stevens Institute of Technology on Castle Point in Hoboken, from Eighth Street to Third Street.",
  home: { x: 48, y: 40 },
  seed: 20260422,
  avenues: [
    { name: "Hudson St", x: 18 },
    { name: "River St", x: 48 },
    { name: "Castle Point", x: 80 },
  ],
  streets: [
    { name: "8th St", y: 12 },
    { name: "6th St", y: 36 },
    { name: "5th St", y: 56 },
    { name: "4th St", y: 76 },
    { name: "3rd St", y: 94, minor: true },
  ],
  skipCells: [
    [2, 0],
    [2, 1],
  ],
  lawns: [
    { x: 0, y: 0, w: 10, h: 100 },
    { x: 82, y: 8, w: 18, h: 48, rx: 14 },
  ],
  featured: [
    { label: "Howe Center", x: 48, y: 24 },
    { label: "Babbio Center", x: 33, y: 46 },
    { label: "Kidde Hall", x: 63, y: 46 },
    { label: "Edwin A. Stevens", x: 48, y: 66 },
    { label: "Burchard", x: 33, y: 66, minor: true },
    { label: "Gatehouse", x: 33, y: 24, minor: true },
    { label: "Castle Point", x: 86, y: 28 },
  ],
  controls: [
    { lat: 40.7462, lng: -74.0284, x: 18, y: 12 },
    { lat: 40.7444, lng: -74.028, x: 18, y: 56 },
    { lat: 40.7428, lng: -74.0276, x: 18, y: 94 },
    { lat: 40.746, lng: -74.0256, x: 48, y: 12 },
    { lat: 40.7448, lng: -74.0256, x: 48, y: 40 },
    { lat: 40.7432, lng: -74.0252, x: 48, y: 76 },
    { lat: 40.7456, lng: -74.0236, x: 80, y: 12 },
    { lat: 40.7442, lng: -74.0234, x: 80, y: 56 },
    { lat: 40.7428, lng: -74.0232, x: 80, y: 94 },
  ],
});

const CAMPUSES: Record<CampusId, CampusDefinition> = {
  columbia: defineCampus(columbiaSpec),
  barnard: defineCampus({ ...barnardSpec, featured: MAP_LABELS.buildings }),
  nyu: defineCampus(NYU),
  newschool: defineCampus(NEW_SCHOOL),
  fordham: defineCampus(FORDHAM),
  pace: defineCampus(PACE),
  cooper: defineCampus(COOPER),
  baruch: defineCampus(BARUCH),
  ccny: defineCampus(CCNY),
  hunter: defineCampus(HUNTER),
  brooklyn: defineCampus(BROOKLYN),
  queens: defineCampus(QUEENS),
  stjohns: defineCampus(ST_JOHNS),
  stevens: defineCampus(STEVENS),
};

const COLLEGE_TO_CAMPUS: Record<(typeof COLLEGES)[number], CampusId> = {
  "Columbia University": "columbia",
  "Barnard College": "barnard",
  "New York University": "nyu",
  "The New School": "newschool",
  "Fordham University": "fordham",
  "Pace University": "pace",
  "Cooper Union": "cooper",
  "CUNY — Baruch College": "baruch",
  "CUNY — City College of New York": "ccny",
  "CUNY — Hunter College": "hunter",
  "CUNY — Brooklyn College": "brooklyn",
  "CUNY — Queens College": "queens",
  "St. John's University": "stjohns",
  "Stevens Institute of Technology": "stevens",
};

export function campusIdFromCollege(college: string): CampusId {
  const exact = COLLEGE_TO_CAMPUS[college as (typeof COLLEGES)[number]];
  if (exact) return exact;
  const name = college.toLowerCase();
  if (name.includes("barnard")) return "barnard";
  if (name.includes("new york university") || name === "nyu") return "nyu";
  if (name.includes("new school")) return "newschool";
  if (name.includes("fordham")) return "fordham";
  if (name.includes("pace")) return "pace";
  if (name.includes("cooper")) return "cooper";
  if (name.includes("baruch")) return "baruch";
  if (name.includes("city college") || name.includes("ccny")) return "ccny";
  if (name.includes("hunter")) return "hunter";
  if (name.includes("brooklyn")) return "brooklyn";
  if (name.includes("queens college")) return "queens";
  if (name.includes("st. john") || name.includes("st john")) return "stjohns";
  if (name.includes("stevens")) return "stevens";
  return "columbia";
}

export function getCampus(id: CampusId): CampusDefinition {
  return CAMPUSES[id];
}

export function campusFromCollege(college: string | undefined | null): CampusDefinition {
  return getCampus(campusIdFromCollege(college ?? ""));
}

/** Columbia and Barnard share the Morningside Heights drawing. */
export function campusMapKey(id: CampusId): CampusId {
  return id === "barnard" ? "columbia" : id;
}

export function sharesCampusMap(a: CampusId, b: CampusId): boolean {
  return campusMapKey(a) === campusMapKey(b);
}

const CAMPUS_IDS = new Set<string>(Object.keys(CAMPUSES));

export function eventCampusId(event: { campusId?: string; latitude?: number; longitude?: number }): CampusId {
  if (event.campusId && CAMPUS_IDS.has(event.campusId)) return event.campusId as CampusId;
  if (event.latitude != null && event.longitude != null) {
    return campusIdFromLatLng({ lat: event.latitude, lng: event.longitude }) ?? "columbia";
  }
  return "columbia";
}

export function containsLatLng(bounds: GeoBounds, { lat, lng }: LatLng): boolean {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

export function campusIdFromLatLng(point: LatLng): CampusId | null {
  const hits = (Object.values(CAMPUSES) as CampusDefinition[]).filter(
    (campus) => campus.spec.id !== "barnard" && containsLatLng(campus.spec.bounds, point),
  );
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0].spec.id;
  const scored = hits.map((campus) => {
    const projected = projectWithControls(point, campus.spec.controls);
    const centerDist = Math.hypot(projected.x - campus.spec.home.x, projected.y - campus.spec.home.y);
    return { id: campus.spec.id, centerDist };
  });
  scored.sort((a, b) => a.centerDist - b.centerDist);
  return scored[0].id;
}

export function geoToCampusMap(point: LatLng, campusId: CampusId): MapPoint {
  return projectWithControls(point, getCampus(campusId).spec.controls);
}

export function campusMapToGeo(point: MapPoint, campusId: CampusId): LatLng {
  return unprojectWithControls(point, getCampus(campusId).spec.controls);
}

export function isOnCampusPlan({ x, y }: MapPoint): boolean {
  return x >= 0 && x <= 100 && y >= 0 && y <= 100;
}

export const ALL_CAMPUS_BOUNDS: GeoBounds[] = (Object.values(CAMPUSES) as CampusDefinition[])
  .filter((campus) => campus.spec.id !== "barnard")
  .map((campus) => campus.spec.bounds);

export { MAP_ART, COLLEGES };
