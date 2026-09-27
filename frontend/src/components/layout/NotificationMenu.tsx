"use client";

import { useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Bell, Radio } from "lucide-react";

import { PizzaSliceIcon } from "@/components/icons/CategoryIcons";
import type { CampusEvent } from "@/types/event";

export type NotificationAction = "freeFood" | "happening";

interface CampusNotice {
  id: string;
  title: string;
  body: string;
  time: string;
  eventId?: string;
  action?: NotificationAction;
  icon: ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
}

interface NotificationMenuProps {
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
  onAction: (action: NotificationAction) => void;
}

function noticesFromEvents(events: CampusEvent[]): CampusNotice[] {
  return events.slice(0, 4).map((event) => ({
    id: `event-${event.id}`,
    title: event.category === "Free Food" ? "Free food on the map" : "New campus event",
    body: `${event.title} at ${event.locationName} · ${event.timeStatus}`,
    time: "Just now",
    eventId: event.id,
    icon: event.category === "Free Food" ? PizzaSliceIcon : Radio,
    iconClass: event.category === "Free Food" ? "" : "text-[#F5453A]",
  }));
}

const STARTER_NOTICES: CampusNotice[] = [
  {
    id: "seed-food",
    title: "Free pizza usually drops at lunch",
    body: "Open Free Food to see anything posted on the Columbia map right now.",
    time: "2m ago",
    action: "freeFood",
    icon: PizzaSliceIcon,
    iconClass: "",
  },
  {
    id: "seed-now",
    title: "What's happening on campus",
    body: "Happening Now shows today's listings. Post an event if you're hosting.",
    time: "1h ago",
    action: "happening",
    icon: Radio,
    iconClass: "text-[#F5453A]",
  },
  {
    id: "seed-welcome",
    title: "Welcome to Campus Connect",
    body: "Save events, tap I'm Going, or ask Gemini what's nearby.",
    time: "Today",
    icon: Bell,
    iconClass: "text-brand",
  },
];

/** Bell menu: campus alerts. The unread dot clears the first time it opens. */
export function NotificationMenu({ events, onSelectEvent, onAction }: NotificationMenuProps) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const notices = useMemo(() => {
    const live = noticesFromEvents(events);
    return live.length > 0 ? [...live, STARTER_NOTICES[2]] : STARTER_NOTICES;
  }, [events]);
  const unread = seen ? 0 : notices.length;

  const openMenu = () => {
    setOpen(true);
    setSeen(true);
  };

  const choose = (notice: CampusNotice) => {
    setOpen(false);
    if (notice.eventId) {
      const event = events.find((item) => item.id === notice.eventId);
      if (event) onSelectEvent(event);
      return;
    }
    if (notice.action) onAction(notice.action);
  };

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className="relative grid h-10 w-10 place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-brand-tint"
      >
        <Bell size={21} strokeWidth={2.1} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-[9px] top-[8px] h-[9px] w-[9px] rounded-full bg-[#F5453A] ring-2 ring-panel"
          />
        )}
      </motion.button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            aria-label="Notifications"
            className="absolute right-0 top-[52px] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[16px] border border-line bg-panel p-1.5 shadow-float"
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <p className="text-[14.5px] font-bold text-ink">Notifications</p>
              <p className="text-[12.5px] font-medium text-muted">Campus alerts</p>
            </div>
            <div aria-hidden className="mx-2 h-px bg-line" />
            <ul className="max-h-[360px] overflow-y-auto py-1 scrollbar-none">
              {notices.map((notice) => {
                const Icon = notice.icon;
                return (
                  <li key={notice.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => choose(notice)}
                      className="flex w-full items-start gap-3 rounded-[11px] px-3 py-2.5 text-left transition-colors duration-100 hover:bg-brand-tint"
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-field">
                        <Icon size={17} aria-hidden className={notice.iconClass} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-bold leading-[1.25] text-ink">
                          {notice.title}
                        </span>
                        <span className="mt-[3px] block text-[12.5px] font-medium leading-[1.35] text-muted">
                          {notice.body}
                        </span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-[11.5px] font-medium text-faint">{notice.time}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
