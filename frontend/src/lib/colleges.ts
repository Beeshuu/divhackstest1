export const OTHER_OPTION = "Other";

/** Schools a student can pick at sign-up and in Settings. */
export const COLLEGES = [
  "Columbia University",
  "Barnard College",
  "New York University",
  "The New School",
  "Fordham University",
  "Pace University",
  "Cooper Union",
  "CUNY — Baruch College",
  "CUNY — City College of New York",
  "CUNY — Hunter College",
  "CUNY — Brooklyn College",
  "CUNY — Queens College",
  "St. John's University",
  "Stevens Institute of Technology",
] as const;

export type CollegeName = (typeof COLLEGES)[number];
