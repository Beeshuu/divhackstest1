"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Info,
  MapPin,
  Navigation,
  PersonStanding,
  Share2,
  Star,
  Ban,
  X,
} from "lucide-react";

import { AvatarStack } from "./AvatarStack";
import { CategoryHeroArt } from "./CategoryHeroArt";
import { EventHeroArt } from "./EventHeroArt";
import { CategoryGlyph, PeopleIcon } from "@/components/icons/CategoryIcons";
import { MARKER_PALETTE } from "@/lib/constants";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn, formatCount } from "@/lib/utils";
import type { CampusEvent } from "@/types/event";

const OPEN_EASE = [0.32, 0.72, 0, 1] as const;

interface EventDrawerProps {
  event: CampusEvent;
  onClose: () => void;
  isGoing: boolean;
  onToggleGoing: () => void;
  isSaved: boolean;
  onToggleSaved: () => void;
  onShare: () => void;
  onDirections: () => void;
  isRejected?: boolean;
  onReject: () => void;
  onRestore?: () => void;
}

/**
 * Sliding detail panel for the selected event.
 *
 * Desktop: an in-flow right column, so the map reclaims the space as the panel
 * slides out. Below 900px it becomes a bottom sheet over the map.
 */
export function EventDrawer(props: EventDrawerProps) {
  const { event } = props;
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
        <DrawerCard {...props} />
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
        <DrawerCard {...props} />
      </motion.aside>
    </motion.div>
  );
}

/** Renders `text` with the first occurrence of `emphasis` in bold. */
function Emphasized({ text, emphasis }: { text: string; emphasis?: string }) {
  const at = emphasis ? text.indexOf(emphasis) : -1;
  if (!emphasis || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-bold text-ink">{emphasis}</strong>
      {text.slice(at + emphasis.length)}
    </>
  );
}

const HERO_BUTTON =
  "grid h-[30px] w-[30px] place-items-center rounded-full bg-white/92 text-ink shadow-[0_1px_4px_rgba(15,37,71,0.18)] backdrop-blur-sm transition-all duration-150 hover:scale-[1.06] hover:bg-white active:scale-95";

function DrawerCard({
  event,
  onClose,
  isGoing,
  onToggleGoing,
  isSaved,
  onToggleSaved,
  onShare,
  onDirections,
  isRejected,
  onReject,
  onRestore,
}: EventDrawerProps) {
  const palette = MARKER_PALETTE[event.markerColor];
  const goingCount = event.goingCount + (isGoing ? 1 : 0);

  return (
    <div className="flex h-full max-h-full flex-col overflow-hidden rounded-[20px] bg-panel shadow-panel">
      <div className="shrink-0 p-[12px] pb-0">
        <div className="relative h-[186px] overflow-hidden rounded-[16px] bg-[#D8CEC0]">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={event.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {event.iconType === "pizza" && !event.isTemporary ? (
                <EventHeroArt />
              ) : (
                <CategoryHeroArt event={event} />
              )}
            </motion.div>
          </AnimatePresence>
          <div className="absolute right-[10px] top-[10px] flex gap-2">
            <button
              type="button"
              onClick={onToggleSaved}
              aria-label={isSaved ? "Remove from saved" : "Save event"}
              aria-pressed={isSaved}
              className={HERO_BUTTON}
            >
              <Bookmark
                size={15}
                strokeWidth={2.4}
                className={cn(isSaved && "fill-brand text-brand")}
              />
            </button>
            <button type="button" onClick={onShare} aria-label="Share event" className={HERO_BUTTON}>
              <Share2 size={15} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close event details"
              className={HERO_BUTTON}
            >
              <X size={16} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="min-h-0 flex-1 overflow-y-auto px-[26px] pb-[18px] pt-[14px] scrollbar-none"
      >
        <span
          className="inline-flex h-[26px] items-center gap-[5px] rounded-full px-[10px] text-[13px] font-semibold"
          style={{ backgroundColor: palette.soft, color: palette.text }}
        >
          <CategoryGlyph category={event.category} size={15} />
          {event.category}
        </span>

        <h1 className="mt-[9px] text-[32px] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">
          {event.title}
        </h1>
        <p className="mt-[4px] text-[15px] font-bold leading-[1.15] text-ink">
          {event.locationName}
        </p>
        {event.source === "university-life" && event.sourceUrl && (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
          >
            University Life listing
            <ExternalLink size={13} strokeWidth={2.3} aria-hidden />
          </a>
        )}

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

        {event.isTemporary && (
          <p className="mt-[14px] flex items-start gap-[7px] rounded-[11px] bg-[#F3F6FB] px-[11px] py-[8px] text-[12.5px] font-medium leading-[1.35] text-muted">
            <Info size={14} strokeWidth={2.3} aria-hidden className="mt-[1px] shrink-0 text-faint" />
            Temporary event — only visible in this browser session. It disappears when you
            refresh.
          </p>
        )}

        <p className="mt-[18px] text-[15px] leading-[21px] text-ink-soft">
          <Emphasized text={event.description} emphasis={event.emphasis} />
        </p>

        <div className="mt-[16px] flex items-start">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-[9px]">
              <PeopleIcon size={20} aria-hidden className="shrink-0 text-brand" />
              <span className="truncate text-[15px] font-bold leading-[1.15] text-ink">
                {formatCount(goingCount)} going
              </span>
            </div>
            <AvatarStack
              className="mt-[8px]"
              people={isGoing ? ["You", "AR", "MK"] : ["AR", "MK", "JT"]}
              count={goingCount}
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
              count={event.interestedCount}
            />
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onToggleGoing}
          aria-pressed={isGoing}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "mt-[21px] flex h-[42px] w-full items-center justify-center gap-[9px] rounded-[13px] text-[16px] font-bold text-white shadow-[0_4px_12px_rgb(23_102_232_/_0.26)] transition-colors duration-150 active:bg-brand-press",
            isGoing ? "bg-brand-dark hover:bg-brand-press" : "bg-brand hover:bg-brand-dark",
          )}
        >
          <span aria-hidden className="grid h-[19px] w-[19px] place-items-center rounded-full bg-white">
            <Check size={12} strokeWidth={3.4} className="text-brand" />
          </span>
          {isGoing ? "You're Going" : "I'm Going"}
        </motion.button>

        <motion.button
          type="button"
          onClick={onDirections}
          aria-label={`Get directions to ${event.locationName}`}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-[9px] flex h-[42px] w-full items-center justify-center gap-[9px] rounded-[13px] bg-brand-soft text-[16px] font-bold text-brand transition-colors duration-150 hover:bg-[#dde8fa]"
        >
          <Navigation size={17} strokeWidth={2.2} aria-hidden className="fill-brand" />
          Directions
        </motion.button>

        {isRejected ? (
          <button
            type="button"
            onClick={onRestore}
            className="mt-[9px] flex h-[40px] w-full items-center justify-center text-[14px] font-semibold text-muted transition-colors duration-150 hover:text-ink"
          >
            Show on map again
          </button>
        ) : (
          <button
            type="button"
            onClick={onReject}
            className="mt-[9px] flex h-[40px] w-full items-center justify-center gap-2 text-[14px] font-semibold text-muted transition-colors duration-150 hover:text-coral-text"
          >
            <Ban size={15} strokeWidth={2.3} aria-hidden />
            Reject event
          </button>
        )}

        <div className="mt-[18px] flex items-start gap-[11px]">
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
          className="mt-[20px] flex w-full items-center gap-[11px] text-left transition-colors duration-150 hover:text-brand"
        >
          <PeopleIcon size={20} aria-hidden className="shrink-0 text-[#48587A]" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-[1.2] text-ink-soft">
            Hosted by {event.host}
          </span>
          <ChevronRight size={17} strokeWidth={2.2} aria-hidden className="shrink-0 text-faint" />
        </button>
      </motion.div>
      </AnimatePresence>
    </div>
  );
}
