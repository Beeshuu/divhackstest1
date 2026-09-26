"use client";

import type { ComponentType } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  Music,
  Pizza,
  Users,
} from "lucide-react";

import { MARKER_PALETTE } from "@/lib/constants";
import type { CampusEvent, MarkerIcon } from "@/types/event";

type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

const MARKER_ICONS: Record<MarkerIcon, IconComponent> = {
  pizza: Pizza,
  music: Music,
  book: BookOpen,
  briefcase: BriefcaseBusiness,
  graduation: GraduationCap,
  run: RunnerIcon,
  users: Users,
};

interface EventMarkerProps {
  event: CampusEvent;
  selected: boolean;
  onSelect: (eventId: string) => void;
}

/**
 * A single teardrop pin anchored by its tip to `event.mapX` / `event.mapY`.
 * Only the selected marker carries the soft outer glow.
 */
export function EventMarker({ event, selected, onSelect }: EventMarkerProps) {
  const palette = MARKER_PALETTE[event.markerColor];
  const Icon = MARKER_ICONS[event.iconType];
  const width = selected ? 39 : 34;
  const height = selected ? 50 : 44;

  return (
    <div
      className="absolute"
      style={{
        left: `${event.mapX}%`,
        top: `${event.mapY}%`,
        transform: "translate(-50%, -100%)",
      }}
    >
      {selected && (
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
          <span
            className="block h-[84px] w-[84px] rounded-full"
            style={{ backgroundColor: palette.solid, opacity: 0.14 }}
          />
          <span
            className="absolute left-1/2 top-1/2 block h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: palette.solid, opacity: 0.18 }}
          />
        </span>
      )}

      <motion.button
        type="button"
        onClick={() => onSelect(event.id)}
        aria-label={`${event.title} at ${event.locationName}`}
        aria-pressed={selected}
        initial={false}
        whileHover={{ scale: 1.08, y: -3 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="relative block origin-bottom drop-shadow-[0_3px_5px_rgba(15,37,71,0.22)]"
        style={{ width, height }}
      >
        <svg
          viewBox="0 0 34 44"
          width={width}
          height={height}
          aria-hidden
          className="block"
        >
          <path
            d="M17 43.2c0 0 15.6-17.4 15.6-26.2a15.6 15.6 0 1 0-31.2 0C1.4 25.8 17 43.2 17 43.2Z"
            fill={palette.solid}
            stroke="#FFFFFF"
            strokeWidth={2.2}
          />
        </svg>
        <span
          aria-hidden
          className="absolute left-0 right-0 top-0 grid place-items-center text-white"
          style={{ height: width }}
        >
          <Icon size={selected ? 19 : 17} strokeWidth={2.3} />
        </span>
      </motion.button>
    </div>
  );
}

/** Lucide has no running figure, so this matches the reference sports pin. */
function RunnerIcon({
  size = 17,
  strokeWidth = 2.3,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="14.5" cy="4.5" r="2.2" fill="currentColor" stroke="none" />
      <path d="M13 8.4 9.6 11l1.8 3.4-2.6 5.4" />
      <path d="m13 8.4 3.6 1.8 1.1 3.6" />
      <path d="m11.4 14.4 4.4 1.2 1.5 4" />
      <path d="M6.2 9.6h3.2" />
    </svg>
  );
}
