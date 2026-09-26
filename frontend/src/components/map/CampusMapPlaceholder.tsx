"use client";

import { Crown } from "lucide-react";

import { CampusMapArt } from "./CampusMapArt";
import { EventMarker } from "./EventMarker";
import { MapControls } from "./MapControls";
import { MAP_LABELS } from "@/lib/constants";
import { USER_LOCATION } from "@/data/mock-events";
import type { CampusEvent } from "@/types/event";

interface CampusMapPlaceholderProps {
  events: CampusEvent[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
}

/**
 * Phase 1 stand-in for the interactive map.
 *
 * The props here are deliberately the same shape a real Mapbox component would
 * need, so Phase 2 can drop in `CampusMap.tsx` without touching the page shell.
 */
export function CampusMapPlaceholder({
  events,
  selectedEventId,
  onSelectEvent,
}: CampusMapPlaceholderProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-map-ground">
      <CampusMapArt />

      {MAP_LABELS.streets.map((street) => (
        <span
          key={street.label}
          className="pointer-events-none absolute whitespace-nowrap text-[12.5px] font-medium tracking-[0.01em] text-map-street-label [text-shadow:0_1px_2px_rgba(255,255,255,0.85)]"
          style={{
            left: `${street.x}%`,
            top: `${street.y}%`,
            transform: `translate(-50%, -50%) rotate(${street.rotate}deg)`,
          }}
        >
          {street.label}
        </span>
      ))}

      {MAP_LABELS.buildings.map((building) => (
        <span
          key={building.label}
          className="pointer-events-none absolute whitespace-pre-line text-center font-serif text-[15px] leading-[1.2] font-normal text-map-label [text-shadow:0_1px_3px_rgba(255,255,255,0.95)]"
          style={{
            left: `${building.x}%`,
            top: `${building.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {building.label}
        </span>
      ))}

      {/* Alma Mater landmark glyph */}
      <Crown
        size={19}
        strokeWidth={2}
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[#3F6FB5]"
        style={{ left: "47.6%", top: "64.8%" }}
      />

      <UserLocationDot />

      {events.map((event) => (
        <EventMarker
          key={event.id}
          event={event}
          selected={event.id === selectedEventId}
          onSelect={onSelectEvent}
        />
      ))}

      <MapControls />
    </div>
  );
}

/** Decorative "you are here" indicator — no geolocation is requested. */
function UserLocationDot() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute grid place-items-center"
      style={{
        left: `${USER_LOCATION.x}%`,
        top: `${USER_LOCATION.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span className="absolute h-[42px] w-[42px] rounded-full bg-[#1D6AEE]/12" />
      <span className="absolute h-[27px] w-[27px] rounded-full bg-white/85" />
      <span className="absolute h-[20px] w-[20px] rounded-full bg-[#1D6AEE] shadow-[0_1px_3px_rgba(15,37,71,0.3)]" />
    </span>
  );
}
