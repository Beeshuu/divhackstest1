"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  PersonStanding,
  Star,
  Users,
  X,
} from "lucide-react";

import { AvatarStack } from "./AvatarStack";
import { EventHeroArt } from "./EventHeroArt";
import { PizzaSliceIcon } from "@/components/icons/CategoryIcons";
import { MARKER_PALETTE } from "@/lib/constants";
import { useMediaQuery } from "@/lib/use-media-query";
import { formatCount } from "@/lib/utils";
import type { CampusEvent } from "@/types/event";

const OPEN_EASE = [0.32, 0.72, 0, 1] as const;

interface EventDrawerProps {
  event: CampusEvent;
  onClose: () => void;
}

/**
 * Sliding detail panel for the selected event.
 *
 * Desktop: an in-flow right column, so the map reclaims the space as the panel
 * slides out. Below 900px it becomes a bottom sheet over the map.
 */
export function EventDrawer({ event, onClose }: EventDrawerProps) {
  const isSheet = useMediaQuery("(max-width: 899px)");
  const isCompact = useMediaQuery("(max-width: 1199px)");

  if (isSheet) {
    return (
      <motion.aside
        aria-label={`${event.title} details`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.28, ease: OPEN_EASE }}
        className="fixed inset-x-0 bottom-0 z-40 max-h-[86vh] px-2 pb-2"
      >
        <DrawerCard event={event} onClose={onClose} />
      </motion.aside>
    );
  }

  const columnWidth = isCompact ? 360 : 416;

  return (
    <motion.div
      initial={{ width: columnWidth }}
      animate={{ width: columnWidth }}
      exit={{ width: 0 }}
      transition={{ duration: 0.26, ease: OPEN_EASE }}
      className="relative z-20 shrink-0 overflow-hidden"
    >
      <motion.aside
        aria-label={`${event.title} details`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: OPEN_EASE }}
        className="absolute inset-y-0 right-0 pb-[10px] pr-[6px] pt-2"
        style={{ width: columnWidth }}
      >
        <DrawerCard event={event} onClose={onClose} />
      </motion.aside>
    </motion.div>
  );
}

function DrawerCard({ event, onClose }: EventDrawerProps) {
  const palette = MARKER_PALETTE[event.markerColor];

  return (
    <div className="flex h-full max-h-full flex-col overflow-hidden rounded-[20px] bg-panel shadow-panel">
      <div className="shrink-0 p-[12px] pb-0">
        <div className="relative h-[186px] overflow-hidden rounded-[16px] bg-[#D8CEC0]">
          <EventHeroArt />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close event details"
            className="absolute right-[10px] top-[10px] grid h-[30px] w-[30px] place-items-center rounded-full bg-white/92 text-ink shadow-[0_1px_4px_rgba(15,37,71,0.18)] backdrop-blur-sm transition-all duration-150 hover:scale-[1.06] hover:bg-white active:scale-95"
          >
            <X size={16} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[26px] pb-[18px] pt-[14px] scrollbar-none">
        <span
          className="inline-flex h-[26px] items-center gap-[5px] rounded-full px-[10px] text-[13px] font-semibold"
          style={{ backgroundColor: palette.soft, color: palette.text }}
        >
          <PizzaSliceIcon size={14} />
          {event.category}
        </span>

        <h1 className="mt-[9px] text-[32px] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">
          {event.title}
        </h1>
        <p className="mt-[4px] text-[15px] font-bold leading-[1.15] text-ink">
          {event.locationName}
        </p>

        <button
          type="button"
          className="mt-[17px] flex w-full items-center gap-[9px] text-left transition-colors duration-150 hover:text-brand"
        >
          <MapPin size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-[1.1] text-ink-soft">
            {event.address}
          </span>
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden className="shrink-0 text-faint" />
        </button>

        <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
          <span className="inline-flex h-[30px] items-center gap-[6px] rounded-full bg-[#E2EBFB] px-[11px] text-[13.5px] font-semibold text-[#1559D0]">
            <PersonStanding size={15} strokeWidth={2.3} aria-hidden />
            {event.distance}
          </span>
          <span className="inline-flex h-[30px] items-center gap-[6px] rounded-full bg-coral-soft px-[11px] text-[13.5px] font-semibold text-coral-text">
            <Clock size={14} strokeWidth={2.4} aria-hidden />
            {event.timeStatus}
          </span>
        </div>

        <p className="mt-[18px] text-[15px] leading-[1.35] text-ink-soft">
          Free pizza for <strong className="font-bold text-ink">Columbia students!</strong> Come
          grab a slice and meet other students. Hosted by the Columbia Undergraduate Council. First
          come, first served while supplies last!
        </p>

        <div className="mt-[15px] flex items-start">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-[9px]">
              <Users
                size={19}
                strokeWidth={1.8}
                aria-hidden
                className="shrink-0 fill-brand text-brand"
              />
              <span className="truncate text-[15px] font-bold leading-[1.15] text-ink">
                {formatCount(event.goingCount)} going
              </span>
            </div>
            <AvatarStack
              className="mt-[8px]"
              people={["AR", "MK", "JT"]}
              overflowLabel={`+${event.goingCount - 4}`}
            />
          </div>

          <span aria-hidden className="mt-[2px] w-px self-stretch bg-line" />

          <div className="min-w-0 flex-1 pl-4">
            <div className="flex items-center gap-[9px]">
              <Star
                size={19}
                strokeWidth={2}
                aria-hidden
                className="shrink-0 fill-[#FBB234] text-[#FBB234]"
              />
              <span className="truncate text-[15px] font-bold leading-[1.15] text-ink">
                {formatCount(event.interestedCount)} interested
              </span>
            </div>
            <AvatarStack
              className="mt-[8px]"
              people={["SL", "DP", "NV"]}
              overflowLabel={`+${event.interestedCount - 4}`}
            />
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-[21px] flex h-[42px] w-full items-center justify-center gap-[9px] rounded-[13px] bg-brand text-[16px] font-bold text-white shadow-[0_4px_12px_rgb(23_102_232_/_0.26)] transition-colors duration-150 hover:bg-brand-dark active:bg-brand-press"
        >
          <span aria-hidden className="grid h-[19px] w-[19px] place-items-center rounded-full bg-white">
            <Check size={12} strokeWidth={3.4} className="text-brand" />
          </span>
          I&apos;m Going
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-[9px] flex h-[42px] w-full items-center justify-center gap-[9px] rounded-[13px] bg-brand-soft text-[16px] font-bold text-brand transition-colors duration-150 hover:bg-[#dde8fa]"
        >
          <Navigation size={17} strokeWidth={2.2} aria-hidden className="fill-brand" />
          Directions
        </motion.button>

        <div className="mt-[8px] flex items-start gap-[11px] border-t border-line pt-[9px]">
          <CalendarDays
            size={19}
            strokeWidth={2.1}
            aria-hidden
            className="mt-[3px] shrink-0 text-[#48587A]"
          />
          <div className="min-w-0">
            <p className="text-[14.5px] font-bold leading-[1.2] text-ink">{event.dateLabel}</p>
            <p className="mt-[4px] text-[14.5px] font-medium leading-[1.2] text-muted">
              {event.startTime} – {event.endTime}{" "}
              <span className="font-semibold text-coral-text">({event.timeStatus})</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-[12px] flex w-full items-center gap-[11px] border-t border-line pt-[9px] text-left transition-colors duration-150 hover:text-brand"
        >
          <Users
            size={19}
            strokeWidth={1.8}
            aria-hidden
            className="shrink-0 fill-[#48587A] text-[#48587A]"
          />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-[1.2] text-ink-soft">
            Hosted by {event.host}
          </span>
          <ChevronRight size={17} strokeWidth={2.2} aria-hidden className="shrink-0 text-faint" />
        </button>
      </div>
    </div>
  );
}
