/**
 * Multi-colour category glyphs.
 *
 * The reference design uses illustrated, solid-filled icons rather than the
 * single-stroke set Lucide provides, so each one is hand-drawn here. Filling a
 * Lucide outline icon with `fill-*` collapses the details that make these
 * readable (the door in the house, the gutter in the book), which is why they
 * are separate components.
 *
 * Every glyph fills its 24-unit viewBox almost edge to edge, so `size` is the
 * rendered glyph size — the reference icons measure ~25px in the sidebar.
 */

import { Music } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EventCategory } from "@/types/event";

export interface GlyphProps {
  size?: number;
  className?: string;
}

/** Cream-on-red palette used when a glyph sits inside a coloured map pin. */
export type PizzaVariant = "color" | "onColor";

const PIZZA_PALETTES: Record<PizzaVariant, { crust: string; cheese: string; topping: string }> = {
  color: { crust: "#F0821E", cheese: "#F9C744", topping: "#D8301C" },
  onColor: { crust: "#FFCB52", cheese: "#FFFBF2", topping: "#F0603A" },
};

/**
 * Tilted slice: rounded crust across the top, tip swinging to the lower left.
 * Narrower than it is tall, matching the illustrated "Free Food" slice.
 */
export function PizzaSliceIcon({
  size = 25,
  className,
  variant = "color",
}: GlyphProps & { variant?: PizzaVariant }) {
  const { crust, cheese, topping } = PIZZA_PALETTES[variant];

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <g transform="rotate(6 12 12)">
        <path d="M5.4 7.1h13.2l-5.9 15.1a0.8 0.8 0 0 1-1.4 0Z" fill={cheese} />
        <path d="M4.9 7.7Q4.9 1.2 12 1.2t7.1 6.5q0 0.7-0.7 0.7H5.6q-0.7 0-0.7-0.7Z" fill={crust} />
        <g fill={topping}>
          <circle cx="9.5" cy="11.7" r="1.5" />
          <circle cx="14.4" cy="12" r="1.4" />
          <circle cx="12" cy="16.4" r="1.3" />
        </g>
      </g>
    </svg>
  );
}

/** Peaked-roof house with the doorway cut out, used for "Happening Now". */
export function HouseIcon({ size = 25, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 1.45a1.9 1.9 0 0 1 1.24.47l9.06 7.92a1.9 1.9 0 0 1 .65 1.43v9.36a1.95 1.95 0 0 1-1.95 1.95h-6.06v-5.4a2.94 2.94 0 0 0-5.88 0v5.4H3a1.95 1.95 0 0 1-1.95-1.95v-9.36a1.9 1.9 0 0 1 .65-1.43l9.06-7.92A1.9 1.9 0 0 1 12 1.45Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Two solid figures, the nearer one larger, as in the reference "Social" row. */
export function PeopleIcon({ size = 25, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <g fill="currentColor">
        <circle cx="17.5" cy="6.1" r="3.8" />
        <path d="M17.5 11.9c3.9 0 6.2 2.4 6.44 6.05a1.22 1.22 0 0 1-1.22 1.3h-4.3v-1.4c0-2.5-1.06-4.6-2.98-5.85a8.6 8.6 0 0 1 2.06-.2Z" />
        <circle cx="8.6" cy="6.5" r="4.4" />
        <path d="M8.6 12.6c5 0 8.06 3.06 8.4 7.5a1.35 1.35 0 0 1-1.35 1.6H1.55A1.35 1.35 0 0 1 .2 20.1c.34-4.44 3.4-7.5 8.4-7.5Z" />
      </g>
    </svg>
  );
}

/** Open book: two filled pages with a thin gutter, left page a shade lighter. */
export function OpenBookIcon({ size = 25, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M11.1 5.55v16.6q-3.6-2.65-8.6-2.85A1.6 1.6 0 0 1 .95 17.7V3.45A1.6 1.6 0 0 1 2.7 1.85q4.85.5 8.4 3.7Z"
        fill="#3D84F6"
      />
      <path
        d="M12.9 5.55v16.6q3.6-2.65 8.6-2.85a1.6 1.6 0 0 0 1.55-1.6V3.45a1.6 1.6 0 0 0-1.75-1.6q-4.85.5-8.4 3.7Z"
        fill="#1B68EA"
      />
    </svg>
  );
}

/** Slate briefcase with a top handle and a latched band across the middle. */
export function BriefcaseIcon({ size = 25, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M8.9 1.85h6.2a3.1 3.1 0 0 1 3.1 3.1V6.9h-2.9V5.3a.85.85 0 0 0-.85-.85H9.55a.85.85 0 0 0-.85.85V6.9H5.8V4.95a3.1 3.1 0 0 1 3.1-3.1Z"
        fill="#45536E"
      />
      <rect x="0.55" y="6.9" width="22.9" height="15.25" rx="2.2" fill="#45536E" />
      <path d="M.55 12.55h9.35v.85a1 1 0 0 0 1 1h2.2a1 1 0 0 0 1-1v-.85h9.35v2.6h-9.35v-.55H9.9v.55H.55Z" fill="#96A0B2" />
    </svg>
  );
}

/** Basketball, drawn rather than stroked so the seams stay crisp at 25px. */
export function BasketballIcon({ size = 25, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="11.8" fill="#F5821F" />
      <g stroke="#FFF6ED" strokeWidth="1.7" strokeLinecap="round" fill="none">
        <path d="M12 0.4v23.2M0.4 12h23.2" />
        <path d="M3.55 3.55a11.8 11.8 0 0 1 0 16.9M20.45 3.55a11.8 11.8 0 0 0 0 16.9" />
      </g>
    </svg>
  );
}

/** Outline bookmark for "Saved" — sized to match the filled glyphs beside it. */
export function BookmarkIcon({ size = 25, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4.6 4.4a2.9 2.9 0 0 1 2.9-2.9h9a2.9 2.9 0 0 1 2.9 2.9v18.1L12 17.2l-7.4 5.3Z" />
    </svg>
  );
}

/** Running figure for the sports pin — Lucide has no equivalent. */
export function RunnerIcon({ size = 18, className }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="14.5" cy="4.6" r="2.3" fill="currentColor" stroke="none" />
      <path d="M13 8.5 9.5 11.1l1.9 3.5-2.7 5.5" />
      <path d="m13 8.5 3.7 1.9 1.1 3.7" />
      <path d="m11.4 14.6 4.5 1.2 1.5 4.1" />
      <path d="M6 9.7h3.3" />
    </svg>
  );
}

/** The illustrated glyph for a category, as used in the sidebar rail. */
export function CategoryGlyph({
  category,
  size = 25,
  className,
}: GlyphProps & { category: EventCategory }) {
  switch (category) {
    case "Free Food":
      return <PizzaSliceIcon size={size} className={className} />;
    case "Social":
      return <PeopleIcon size={size} className={cn("text-[#A24BEE]", className)} />;
    case "Academic":
      return <OpenBookIcon size={size} className={className} />;
    case "Career":
      return <BriefcaseIcon size={size} className={className} />;
    case "Sports":
      return <BasketballIcon size={size} className={className} />;
    case "Entertainment":
      return <Music size={size} strokeWidth={2.4} aria-hidden className={cn("text-[#9451EE]", className)} />;
  }
}
