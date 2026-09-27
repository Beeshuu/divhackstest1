"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, MapPin } from "lucide-react";

import { CategoryGlyph } from "@/components/icons/CategoryIcons";
import type { CampusEvent, SidebarFilter } from "@/types/event";

interface LocationEventsListProps {
  filter: SidebarFilter;
  events: CampusEvent[];
  onSelect: (event: CampusEvent) => void;
}

const COPY: Partial<Record<SidebarFilter, { title: string; empty: string }>> = {
  tbd: {
    title: "TBD locations",
    empty: "University Life has no events without a listed location right now.",
  },
  remote: {
    title: "Remote events",
    empty: "University Life has no remote or online events right now.",
  },
};

/** List that replaces map pins when TBD or Remote is selected. */
export function LocationEventsList({ filter, events, onSelect }: LocationEventsListProps) {
  const copy = COPY[filter];
  if (!copy) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={filter}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-x-3 top-[76px] z-20 max-h-[min(68vh,560px)] overflow-hidden rounded-[18px] border border-line bg-panel shadow-float tablet:inset-x-auto tablet:left-4 tablet:w-[min(420px,calc(100%-32px))]"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[15px] font-extrabold text-ink">{copy.title}</p>
            <p className="text-[12.5px] font-medium text-muted">From University Life · updates with their calendar</p>
          </div>
          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[12px] font-bold text-brand">
            {events.length}
          </span>
        </div>
        <div aria-hidden className="mx-3 h-px bg-line" />
        <ul className="max-h-[min(56vh,460px)] overflow-y-auto p-1.5 scrollbar-none">
          {events.length === 0 ? (
            <li className="px-3 py-8 text-center text-[13.5px] font-medium text-muted">{copy.empty}</li>
          ) : (
            events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-brand-tint"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-field">
                    <CategoryGlyph category={event.category} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-bold text-ink">{event.title}</span>
                    <span className="mt-[3px] flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
                      <MapPin size={12} strokeWidth={2.3} aria-hidden />
                      <span className="truncate">{event.locationName}</span>
                    </span>
                    <span className="mt-[2px] flex items-center gap-1.5 text-[12.5px] font-medium text-faint">
                      <CalendarDays size={12} strokeWidth={2.3} aria-hidden />
                      <span className="truncate">
                        {event.dateLabel} · {event.startTime}–{event.endTime}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}
