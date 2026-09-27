"use client";

import type { ComponentType } from "react";
import { ChevronRight, Radio } from "lucide-react";

import { PeopleIcon, PizzaSliceIcon } from "@/components/icons/CategoryIcons";
import { cn, formatCount, isEventToday, isMappedCampusEvent } from "@/lib/utils";
import type { CampusEvent } from "@/types/event";

type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

type StatId = "happening" | "active" | "freeFood";

interface Stat {
  id: StatId;
  value: number;
  label: string;
  icon: IconComponent;
  iconClass: string;
}

interface CampusStatsProps {
  events: CampusEvent[];
  goingCount: number;
  active: StatId | null;
  onSelect: (id: StatId) => void;
}

/**
 * Floating campus summary bar. Each cell filters the map to that slice.
 */
export function CampusStats({ events, goingCount, active, onSelect }: CampusStatsProps) {
  const stats: Stat[] = [
    {
      id: "happening",
      value: events.filter((event) => isMappedCampusEvent(event) && isEventToday(event)).length,
      label: "happening now",
      icon: Radio,
      iconClass: "text-[#F5453A]",
    },
    {
      id: "active",
      value: goingCount,
      label: "active on campus",
      icon: PeopleIcon,
      iconClass: "text-brand",
    },
    {
      id: "freeFood",
      value: events.filter((event) => event.category === "Free Food").length,
      label: "free food events",
      icon: PizzaSliceIcon,
      iconClass: "",
    },
  ];

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 w-[84%] max-w-[760px] -translate-x-1/2">
      <div
        role="group"
        aria-label="Campus stats"
        className="pointer-events-auto flex h-[83px] items-stretch overflow-hidden rounded-[20px] bg-panel shadow-float"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const selected = stat.id === active;
          return (
            <button
              key={stat.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(stat.id)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 px-3 text-left transition-colors duration-150 tablet:gap-[15px] tablet:px-[18px]",
                selected ? "bg-brand-tint" : "hover:bg-[#f5f7fb]",
              )}
              style={
                index > 0
                  ? { borderLeft: "1px solid var(--color-line)" }
                  : undefined
              }
            >
              <Icon
                size={28}
                strokeWidth={2}
                aria-hidden
                className={`shrink-0 ${stat.iconClass}`}
              />
              <span className="min-w-0">
                <span className="block text-[24px] font-extrabold leading-none tracking-[-0.02em] text-ink">
                  {formatCount(stat.value)}
                </span>
                <span className="mt-[5px] block truncate text-[13.5px] font-medium leading-tight text-muted">
                  {stat.label}
                </span>
              </span>
              <ChevronRight
                size={18}
                strokeWidth={2.2}
                aria-hidden
                className="ml-auto hidden shrink-0 text-faint tablet:block"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
