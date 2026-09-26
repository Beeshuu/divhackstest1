import { CategoryGlyph } from "@/components/icons/CategoryIcons";
import { MARKER_PALETTE } from "@/lib/constants";
import type { CampusEvent } from "@/types/event";

/**
 * Generic hero for events without bespoke artwork: a soft category-tinted
 * campus scene with the category glyph. Local SVG only, no remote images.
 */
export function CategoryHeroArt({ event }: { event: CampusEvent }) {
  const palette = MARKER_PALETTE[event.markerColor];
  const gradientId = `hero-${event.id}`;

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 386 186"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`${event.category} event at ${event.locationName}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={palette.soft} />
            <stop offset="1" stopColor={palette.solid} stopOpacity="0.38" />
          </linearGradient>
        </defs>
        <rect width="386" height="186" fill={`url(#${gradientId})`} />
        {/* Soft campus skyline */}
        <g fill="#FFFFFF" opacity="0.5">
          <rect x="18" y="96" width="74" height="90" rx="4" />
          <rect x="104" y="72" width="96" height="114" rx="4" />
          <path d="M104 72 L152 44 L200 72 Z" />
          <rect x="214" y="104" width="62" height="82" rx="4" />
          <rect x="288" y="84" width="84" height="102" rx="4" />
        </g>
        <g fill="#FFFFFF" opacity="0.35">
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <rect key={`${r}-${c}`} x={116 + c * 17} y={88 + r * 22} width="9" height="12" rx="1.5" />
            )),
          )}
        </g>
        <g fill={palette.solid} opacity="0.22">
          <circle cx="96" cy="170" r="22" />
          <circle cx="210" cy="176" r="18" />
          <circle cx="284" cy="172" r="20" />
        </g>
      </svg>
      <span className="absolute left-1/2 top-1/2 grid h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_6px_18px_rgba(15,37,71,0.14)]">
        <CategoryGlyph category={event.category} size={36} />
      </span>
    </div>
  );
}
