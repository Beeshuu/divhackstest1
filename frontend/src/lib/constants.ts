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

/** Landmark and street labels drawn over the illustrated campus map. */
export const MAP_LABELS = {
  buildings: [
    { label: "Teachers\nCollege", x: 53, y: 16.2 },
    { label: "Barnard\nCollege", x: 30.1, y: 42.8 },
    { label: "Uris Hall", x: 52.2, y: 31.4 },
    { label: "Schermerhorn\nHall", x: 64.4, y: 31.6 },
    { label: "Low Library", x: 53, y: 43.2 },
    { label: "Alma Mater", x: 52.4, y: 48.6 },
    { label: "Hamilton\nHall", x: 43.6, y: 55.4 },
    { label: "South Field", x: 58.2, y: 55.6 },
    { label: "Lerner Hall", x: 41.8, y: 63.1 },
    { label: "Butler Library", x: 53.2, y: 63.1 },
    { label: "Cathedral of\nSt. John", x: 79.6, y: 84.2 },
  ],
  streets: [
    { label: "W 122nd St", x: 50, y: 5.53, rotate: 0 },
    { label: "W 120th St", x: 50, y: 19.94, rotate: 0 },
    { label: "W 116th St", x: 50, y: 51.29, rotate: 0 },
    { label: "W 114th St", x: 18.4, y: 66.6, rotate: 0 },
    { label: "W 110th St", x: 50, y: 96.95, rotate: 0 },
    { label: "Riverside Dr", x: 12.1, y: 38, rotate: 90 },
    { label: "Broadway", x: 36.42, y: 74, rotate: 90 },
    { label: "Amsterdam Ave", x: 69.51, y: 40, rotate: 90 },
    { label: "Morningside Dr", x: 89.75, y: 36, rotate: 90 },
  ],
} as const;

