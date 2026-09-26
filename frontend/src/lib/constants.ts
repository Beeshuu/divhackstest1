import type { MarkerColor } from "@/types/event";

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

/** Building and street labels drawn over the placeholder campus map. */
export const MAP_LABELS = {
  buildings: [
    { label: "Lerner Hall", x: 53.3, y: 24.6 },
    { label: "Schermerhorn\nHall", x: 28.4, y: 33.4 },
    { label: "Uris Hall", x: 77.6, y: 36.2 },
    { label: "Butler Library", x: 50.4, y: 45.2 },
    { label: "Low Steps", x: 49.4, y: 55.2 },
    { label: "Alma Mater", x: 47.6, y: 68.2 },
    { label: "Hamilton\nHall", x: 23.2, y: 66.6 },
    { label: "Dodge Fitness\nCenter", x: 72.6, y: 67.6 },
    { label: "South Field", x: 46.4, y: 77.2 },
  ],
  streets: [
    { label: "W 116th St", x: 32.8, y: 11.2, rotate: 0 },
    { label: "W 115th St", x: 6.4, y: 33.4, rotate: 0 },
    { label: "W 114th St", x: 5.8, y: 58.2, rotate: 0 },
    { label: "W 113th St", x: 43.2, y: 86.0, rotate: 0 },
    { label: "Broadway", x: 12.2, y: 43.0, rotate: 90 },
    { label: "Amsterdam Ave", x: 92.2, y: 37.0, rotate: 90 },
  ],
} as const;
