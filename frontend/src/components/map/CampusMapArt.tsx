import { MAP_ART } from "@/lib/geo";

/**
 * Morningside Heights campus plan — the same block of city as Google and
 * Apple Maps between Riverside Drive and Morningside Park, 110th–122nd St.
 *
 * Pins and the live location marker are projected onto this artwork in `geo.ts`.
 */
export function CampusMapArt() {
  return (
    <img
      src={MAP_ART.src}
      width={MAP_ART.width}
      height={MAP_ART.height}
      alt="Map of Columbia University, Barnard College, and Teachers College in Morningside Heights, from 110th to 122nd Street between Riverside Drive and Morningside Drive."
      draggable={false}
      className="pointer-events-none h-full w-full select-none"
    />
  );
}
