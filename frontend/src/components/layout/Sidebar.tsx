"use client";

import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { MapPinOff, Monitor, Plus, X } from "lucide-react";

import { GeminiSparkle } from "@/components/gemini/GeminiSparkle";
import { BookmarkIcon, HouseIcon } from "@/components/icons/CategoryIcons";
import { cn } from "@/lib/utils";
import type { SidebarFilter } from "@/types/event";

type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

interface NavItem {
  label: string;
  filter: SidebarFilter;
  icon: IconComponent;
  /** Tint for the single-colour glyphs; the illustrated ones carry their own. */
  iconClass: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Happening Now", filter: "all", icon: HouseIcon, iconClass: "text-brand" },
  { label: "Saved", filter: "saved", icon: BookmarkIcon, iconClass: "text-[#3B4A66]" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selected: SidebarFilter;
  onSelect: (filter: SidebarFilter) => void;
  savedCount: number;
  tbdCount: number;
  remoteCount: number;
  onPostEvent: () => void;
  onAskGemini: () => void;
}

/** Category rail: filters the events shown on the map. */
export function Sidebar({
  isOpen,
  onClose,
  selected: selectedFilter,
  onSelect,
  savedCount,
  tbdCount,
  remoteCount,
  onPostEvent,
  onAskGemini,
}: SidebarProps) {
  return (
    <aside
      aria-label="Campus navigation"
      className={cn(
        "fixed bottom-0 left-0 top-[72px] z-[60] flex w-[276px] shrink-0 flex-col overflow-y-auto border-r border-line-strong bg-rail px-4 pt-4 shadow-float transition-transform duration-200 ease-out scrollbar-none",
        "tablet:static tablet:z-auto tablet:w-[236px] tablet:translate-x-0 tablet:px-3.5 tablet:shadow-none desktop:w-[276px] desktop:px-4",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close navigation menu"
        className="mb-2 ml-auto grid h-9 w-9 place-items-center rounded-[10px] text-ink-soft transition-colors duration-150 hover:bg-brand-tint hover:text-brand tablet:hidden"
      >
        <X size={19} strokeWidth={2.2} />
      </button>

      <nav className="flex flex-col gap-[5px]">
        {NAV_ITEMS.map((item) => {
          const selected = item.filter === selectedFilter;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelect(item.filter)}
              className={cn(
                "flex h-[49px] items-center gap-[18px] rounded-[13px] px-[18px] text-left text-[15.5px] transition-colors duration-150 ease-out",
                selected
                  ? "bg-brand-tint font-bold text-brand"
                  : "font-semibold text-ink hover:bg-[#f0f3f9]",
              )}
            >
              <Icon size={25} aria-hidden className={cn("shrink-0", item.iconClass)} />
              <span className="truncate">{item.label}</span>
              {item.filter === "saved" && savedCount > 0 && (
                <span className="ml-auto rounded-full bg-brand-tint px-2 py-[1px] text-[12px] font-bold text-brand">
                  {savedCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-line pt-3" aria-label="Events without a mapped location">
        <p className="px-[18px] pb-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint">
          Location
        </p>
        {(
          [
            { label: "TBD locations", filter: "tbd" as const, icon: MapPinOff, count: tbdCount },
            { label: "Remote", filter: "remote" as const, icon: Monitor, count: remoteCount },
          ] as const
        ).map((item) => {
          const selected = item.filter === selectedFilter;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              aria-current={selected ? "page" : undefined}
              aria-pressed={selected}
              onClick={() => onSelect(item.filter)}
              className={cn(
                "flex h-[49px] w-full items-center gap-[18px] rounded-[13px] px-[18px] text-left text-[15.5px] transition-colors duration-150 ease-out",
                selected ? "bg-brand-tint font-bold text-brand" : "font-semibold text-ink hover:bg-[#f0f3f9]",
              )}
            >
              <Icon size={22} strokeWidth={2.1} aria-hidden className="shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.count > 0 && (
                <span className="ml-auto rounded-full bg-brand-tint px-2 py-[1px] text-[12px] font-bold text-brand">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={onPostEvent}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="mt-[21px] flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[16px] font-bold text-white shadow-[0_6px_16px_rgb(23_102_232_/_0.28)] transition-colors duration-150 hover:bg-brand-dark active:bg-brand-press"
      >
        <Plus size={19} strokeWidth={2.8} aria-hidden />
        Post Event
      </motion.button>

      <motion.button
        type="button"
        onClick={onAskGemini}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[16px] font-bold text-white shadow-[0_6px_16px_rgb(109_40_217_/_0.22)] transition-opacity duration-150 hover:opacity-95"
        style={{ background: "linear-gradient(135deg, #4B8BFF 0%, #7C5CFF 48%, #C084FC 100%)" }}
      >
        <GeminiSparkle size={18} />
        Ask Gemini
      </motion.button>
    </aside>
  );
}
