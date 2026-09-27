"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, MapPin, Users, X } from "lucide-react";

import { CategoryGlyph } from "@/components/icons/CategoryIcons";
import { cn } from "@/lib/utils";
import type { CampusEvent, SidebarFilter } from "@/types/event";

interface LocationEventsListProps {
  filter: SidebarFilter;
  events: CampusEvent[];
  onSelect: (event: CampusEvent) => void;
  onClose: () => void;
  goingIds?: Set<string>;
  onAccept?: (event: CampusEvent) => void;
  onReject?: (event: CampusEvent) => void;
}

const COPY: Partial<Record<SidebarFilter, { title: string; empty: string; source: string }>> = {
  tbd: {
    title: "TBD locations",
    empty: "The official campus calendar has no events without a listed location right now.",
    source: "From the official campus calendar",
  },
  remote: {
    title: "Remote events",
    empty: "The official campus calendar has no remote or online events right now.",
    source: "From the official campus calendar",
  },
  userLed: {
    title: "User Led Events",
    empty: "No student-posted events on your campus right now. Use Post Event to add one.",
    source: "Posted by students on your campus",
  },
  saved: {
    title: "Saved",
    empty: "You haven't saved any events yet — use the bookmark on an event.",
    source: "Bookmarked listings, including remote and TBD",
  },
  trending: {
    title: "Trending",
    empty: "No upcoming campus events have enough people going yet.",
    source: "The 5 most-attended events coming up soon",
  },
};

const ACTION =
  "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors duration-150";

/** List that replaces map pins when TBD or Remote is selected. */
export function LocationEventsList({
  filter,
  events,
  onSelect,
  onClose,
  goingIds,
  onAccept,
  onReject,
}: LocationEventsListProps) {
  const copy = COPY[filter];
  const showActions = filter === "userLed" && (onAccept || onReject);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!copy) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={filter}
        role="dialog"
        aria-label={copy.title}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-x-3 top-[76px] z-20 max-h-[min(68vh,560px)] overflow-hidden rounded-[18px] border border-line bg-panel shadow-float tablet:inset-x-auto tablet:left-4 tablet:w-[min(420px,calc(100%-32px))]"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold text-ink">{copy.title}</p>
            <p className="text-[12.5px] font-medium text-muted">{copy.source}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[12px] font-bold text-brand">
              {events.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${copy.title}`}
              className="grid h-[30px] w-[30px] place-items-center rounded-full bg-field text-ink transition-colors hover:bg-[#e6eaf2]"
            >
              <X size={16} strokeWidth={2.6} />
            </button>
          </div>
        </div>
        <div aria-hidden className="mx-3 h-px bg-line" />
        <ul className="max-h-[min(56vh,460px)] overflow-y-auto p-1.5 scrollbar-none">
          {events.length === 0 ? (
            <li className="px-3 py-8 text-center text-[13.5px] font-medium text-muted">{copy.empty}</li>
          ) : (
            events.map((event) => {
              const accepted = goingIds?.has(event.id) ?? false;
              return (
              <li key={event.id}>
                <div className="flex items-start gap-1 rounded-[12px] pr-1.5 transition-colors hover:bg-brand-tint">
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-[12px] px-3 py-2.5 text-left"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-field">
                    <CategoryGlyph category={event.category} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-bold text-ink">{event.title}</span>
                    <span className="mt-[3px] flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
                      <MapPin size={12} strokeWidth={2.3} aria-hidden />
                      <span className="truncate">
                        {event.locationName}
                        {filter === "userLed" ? ` · ${event.host}` : ""}
                      </span>
                    </span>
                    <span className="mt-[2px] flex items-center gap-1.5 text-[12.5px] font-medium text-faint">
                      <CalendarDays size={12} strokeWidth={2.3} aria-hidden />
                      <span className="truncate">
                        {event.dateLabel} · {event.startTime}–{event.endTime}
                      </span>
                    </span>
                    {filter === "trending" && (
                      <span className="mt-[2px] flex items-center gap-1.5 text-[12.5px] font-medium text-brand">
                        <Users size={12} strokeWidth={2.3} aria-hidden />
                        <span>
                          {event.goingCount + (goingIds?.has(event.id) ? 1 : 0)} going
                        </span>
                      </span>
                    )}
                  </span>
                </button>
                {showActions && (
                  <div className="flex shrink-0 items-center gap-1.5 pt-3 pr-1">
                    {onAccept && (
                      <button
                        type="button"
                        aria-label={accepted ? `You're going to ${event.title}` : `Accept ${event.title}`}
                        aria-pressed={accepted}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!accepted) onAccept(event);
                        }}
                        className={cn(
                          ACTION,
                          accepted
                            ? "border-brand bg-brand text-white"
                            : "border-line bg-white text-brand hover:border-brand/40 hover:bg-brand-tint",
                        )}
                      >
                        <Check size={15} strokeWidth={2.8} />
                      </button>
                    )}
                    {onReject && (
                      <button
                        type="button"
                        aria-label={`Reject ${event.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject(event);
                        }}
                        className={`${ACTION} border-line bg-white text-[#8A96AB] hover:border-[#F5453A]/30 hover:bg-[#FEF2F2] hover:text-[#F5453A]`}
                      >
                        <X size={15} strokeWidth={2.8} />
                      </button>
                    )}
                  </div>
                )}
                </div>
              </li>
              );
            })
          )}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}
