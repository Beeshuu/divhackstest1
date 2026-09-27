import type { EventCategory, MarkerColor, MarkerIcon } from "@/types/event";

export const EVENT_CATEGORIES: EventCategory[] = [
  "Free Food",
  "Social",
  "Academic",
  "Career",
  "Sports",
  "Entertainment",
];

/** Marker colour and glyph a newly posted event gets for its category. */
export const CATEGORY_STYLE: Record<EventCategory, { markerColor: MarkerColor; iconType: MarkerIcon }> = {
  "Free Food": { markerColor: "coral", iconType: "pizza" },
  Social: { markerColor: "pink", iconType: "users" },
  Academic: { markerColor: "blue", iconType: "book" },
  Career: { markerColor: "orange", iconType: "briefcase" },
  Sports: { markerColor: "green", iconType: "run" },
  Entertainment: { markerColor: "purple", iconType: "music" },
};

/**
 * Layout dimensions measured from the Campus Connect reference design
 * (values are for the primary ~1536x864 desktop target).
 */
export const LAYOUT = {
  navbarHeight: 72,
  sidebarWidth: 276,
  sidebarWidthCompact: 236,
  drawerColumnWidth: 416,
  drawerColumnWidthCompact: 360,
  searchMaxWidth: 620,
} as const;

/** Category palette sampled from the reference screenshot. */
export interface CategoryPalette {
  /** Saturated marker / icon fill. */
  solid: string;
  /** Soft tinted background for pills and badges. */
  soft: string;
  /** Readable text colour on top of `soft`. */
  text: string;
}

export const MARKER_PALETTE: Record<MarkerColor, CategoryPalette> = {
  coral: { solid: "#F13F2D", soft: "#FCE2E3", text: "#E23522" },
  pink: { solid: "#F7609B", soft: "#FDE4EF", text: "#DE3C7E" },
  blue: { solid: "#1B68EA", soft: "#E2EBFB", text: "#1559D0" },
  orange: { solid: "#FA8625", soft: "#FDEBD8", text: "#D96C10" },
  green: { solid: "#30B45E", soft: "#DFF3E6", text: "#1F914A" },
  purple: { solid: "#9451EE", soft: "#EDE4FD", text: "#7B39D8" },
  teal: { solid: "#2FB7C9", soft: "#DDF2F5", text: "#1B96A7" },
};

export interface MapBuildingLabel {
  label: string;
  x: number;
  y: number;
  /** Hidden at the default framing; fades in after a zoom. */
  minor?: boolean;
}

export interface MapStreetLabel {
  label: string;
  x: number;
  y: number;
  rotate: number;
  minor?: boolean;
}

/**
 * Building names from official Columbia, Barnard, and Teachers College maps
 * (Operations directory, Housing, Visitors Center walking tour, Barnard 2024
 * campus map, Teachers College building list).
 */
export const MAP_LABELS: {
  buildings: MapBuildingLabel[];
  streets: MapStreetLabel[];
} = {
  buildings: [
    { label: "Grant’s Tomb", x: 6.2, y: 4.2, minor: true },
    { label: "Riverside Church", x: 6.4, y: 10.8, minor: true },
    { label: "Union Theological", x: 30.1, y: 8.8, minor: true },
    { label: "Horace Mann", x: 48.2, y: 8.9, minor: true },
    { label: "Grace Dodge", x: 58.4, y: 8.9, minor: true },
    { label: "School of Social Work", x: 79.6, y: 8.9, minor: true },
    { label: "Interchurch Center", x: 18, y: 16.1, minor: true },
    { label: "Knox Hall", x: 30.1, y: 16.1, minor: true },
    { label: "Zankel Hall", x: 53, y: 16.2 },
    { label: "Altschul Hall", x: 18, y: 23.8, minor: true },
    { label: "Northwest Corner", x: 43.2, y: 23.6, minor: true },
    { label: "Schapiro CEPSR", x: 53.2, y: 23.5, minor: true },
    { label: "Mudd Building", x: 63.8, y: 23.6, minor: true },
    { label: "Milbank Hall", x: 30.1, y: 28.4, minor: true },
    { label: "Chandler Hall", x: 42.4, y: 31.6, minor: true },
    { label: "Havemeyer Hall", x: 48.6, y: 31.5, minor: true },
    { label: "Uris Hall", x: 54.8, y: 31.4 },
    { label: "Schermerhorn Hall", x: 64.2, y: 31.6 },
    { label: "Casa Italiana", x: 79.6, y: 31.4, minor: true },
    { label: "The Diana Center", x: 30.1, y: 38.2, minor: true },
    { label: "Mathematics", x: 42.2, y: 40.2, minor: true },
    { label: "Earl Hall", x: 47.6, y: 41.4, minor: true },
    { label: "Low Library", x: 53, y: 41.6 },
    { label: "St. Paul’s Chapel", x: 64.4, y: 41.2, minor: true },
    { label: "International Affairs", x: 77.2, y: 40.8, minor: true },
    { label: "Faculty House", x: 84.2, y: 41.6, minor: true },
    { label: "Barnard Hall", x: 27.2, y: 46.4 },
    { label: "Hewitt & Brooks", x: 33.8, y: 47.8, minor: true },
    { label: "Dodge Hall", x: 42.4, y: 47.2, minor: true },
    { label: "Alma Mater", x: 52.4, y: 48.8, minor: true },
    { label: "Philosophy Hall", x: 64.2, y: 47.4, minor: true },
    { label: "Jerome Greene Hall", x: 78.4, y: 47.6, minor: true },
    { label: "Schapiro Hall", x: 30.1, y: 55.4, minor: true },
    { label: "Pulitzer Hall", x: 41.6, y: 55.4, minor: true },
    { label: "Hamilton Hall", x: 46.2, y: 55.4 },
    { label: "South Field", x: 56.8, y: 55.6 },
    { label: "Hartley & Wallach", x: 64.6, y: 55.4, minor: true },
    { label: "East Campus", x: 79.6, y: 55.5, minor: true },
    { label: "Wien Hall", x: 79.6, y: 62.4, minor: true },
    { label: "Lerner Hall", x: 41.8, y: 63.1 },
    { label: "Butler Library", x: 53.2, y: 63.1 },
    { label: "John Jay Hall", x: 64.4, y: 63.1, minor: true },
    { label: "Alumni Center", x: 30.1, y: 70.6, minor: true },
    { label: "Hogan Hall", x: 53, y: 70.6, minor: true },
    { label: "McBain Hall", x: 53, y: 78.2, minor: true },
    { label: "Cathedral of St. John", x: 79.6, y: 84.2 },
    { label: "611 W 112th", x: 46.2, y: 85.5, minor: true },
    { label: "The School at Columbia", x: 53, y: 93.1, minor: true },
  ],
  streets: [
    { label: "122nd St", x: 50, y: 5.53, rotate: 0, minor: true },
    { label: "120th St", x: 50, y: 19.94, rotate: 0, minor: true },
    { label: "116th St", x: 50, y: 51.29, rotate: 0 },
    { label: "114th St", x: 18.4, y: 66.6, rotate: 0, minor: true },
    { label: "110th St", x: 50, y: 96.95, rotate: 0, minor: true },
    { label: "Riverside Dr", x: 12.1, y: 38, rotate: 90, minor: true },
    { label: "Claremont", x: 23.83, y: 72, rotate: 90, minor: true },
    { label: "Broadway", x: 36.42, y: 58, rotate: 90 },
    { label: "Amsterdam Ave", x: 69.51, y: 40, rotate: 90 },
    { label: "Morningside Dr", x: 89.75, y: 36, rotate: 90, minor: true },
  ],
};

