"use client";

import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, Grid2x2, MapPin, TrendingUp } from "lucide-react";

import { PizzaSliceIcon } from "@/components/icons/CategoryIcons";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

interface Filter {
  label: string;
  icon: IconComponent;
  dropdown?: boolean;
}

const FILTERS: Filter[] = [
  { label: "Trending", icon: TrendingUp },
  { label: "Near Me", icon: MapPin },
  { label: "Free Food", icon: PizzaSliceIcon },
  { label: "Today", icon: CalendarDays, dropdown: true },
  { label: "All Categories", icon: Grid2x2, dropdown: true },
];

const ACTIVE = "Trending";

/**
 * Floating filter row over the top of the map. Presentation-only in Phase 1:
 * the active pill is fixed to "Trending" and nothing is filtered.
 */
export function MapFilters() {
  return (
    <div
      role="group"
      aria-label="Event filters"
      className="pointer-events-none absolute left-0 right-0 top-4 z-10 overflow-x-auto px-[24px] scrollbar-none"
    >
      <div className="pointer-events-auto flex w-max gap-[22px] pb-1">
        {FILTERS.map((filter) => {
          const active = filter.label === ACTIVE;
          const Icon = filter.icon;
          return (
            <motion.button
              key={filter.label}
              type="button"
              aria-pressed={active}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={cn(
                "flex h-[42px] shrink-0 items-center gap-[7px] rounded-full px-[13px] text-[14px] font-semibold transition-shadow duration-150",
                active
                  ? "bg-brand text-white shadow-[0_2px_6px_rgba(23,102,232,0.28),0_8px_18px_rgba(23,102,232,0.2)] hover:shadow-[0_3px_8px_rgba(23,102,232,0.32),0_12px_24px_rgba(23,102,232,0.24)]"
                  : "border border-line bg-panel text-ink-soft shadow-pill hover:shadow-pill-hover",
              )}
            >
              <Icon
                size={16}
                strokeWidth={2.3}
                className={active ? "text-white" : "text-brand"}
              />
              {filter.label}
              {filter.dropdown && (
                <ChevronDown
                  size={14}
                  strokeWidth={2.4}
                  aria-hidden
                  className={cn("-ml-[2px] -mr-[2px]", active ? "text-white/80" : "text-faint")}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
