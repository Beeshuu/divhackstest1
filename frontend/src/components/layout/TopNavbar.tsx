"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Bell, ChevronDown, Crown, Menu, Search } from "lucide-react";

interface TopNavbarProps {
  onOpenSidebar: () => void;
}

/**
 * Fixed-height application header: brand block, visual-only search field and
 * the account cluster. Nothing here performs a real query in Phase 1.
 */
export function TopNavbar({ onOpenSidebar }: TopNavbarProps) {
  return (
    <header className="z-30 flex h-[72px] shrink-0 items-center border-b border-line bg-panel">
      <div className="flex w-[196px] shrink-0 items-center gap-2 pl-4 tablet:w-[236px] tablet:gap-2.5 tablet:pl-5 desktop:w-[276px]">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-[10px] text-ink-soft transition-colors duration-150 hover:bg-brand-tint hover:text-brand tablet:hidden"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center text-brand"
        >
          <Crown size={27} strokeWidth={1.6} className="fill-brand" />
        </span>

        <span className="min-w-0 leading-none">
          <span className="block truncate text-[22px] font-extrabold tracking-[-0.02em] text-ink">
            Campus Connect
          </span>
          <span className="mt-[3px] block truncate text-[12.5px] font-medium text-muted">
            Columbia University
          </span>
        </span>
      </div>

      <div className="min-w-0 flex-1 pl-2 pr-3 tablet:pl-6 desktop:pl-8">
        <SearchField />
      </div>

      <AccountCluster />
    </header>
  );
}

function SearchField() {
  return (
    <div className="relative w-full max-w-[620px]">
      <Search
        size={18}
        strokeWidth={2.2}
        aria-hidden
        className="pointer-events-none absolute left-[17px] top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        type="text"
        readOnly
        aria-label="Search events, locations, people, or clubs"
        placeholder="Search events, locations, people, or clubs..."
        className="h-11 w-full cursor-text rounded-full border border-transparent bg-field pl-[46px] pr-4 text-[15px] font-medium text-ink placeholder:font-normal placeholder:text-faint transition-colors duration-150 hover:bg-[#edf0f6] focus:border-brand/30 focus:bg-white focus:outline-none"
      />
    </div>
  );
}

function AccountCluster() {
  return (
    <div className="flex shrink-0 items-center gap-2 pr-4 tablet:gap-3.5 tablet:pr-[25px]">
      <motion.button
        type="button"
        aria-label="Notifications, 1 unread"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className="relative grid h-10 w-10 place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-brand-tint"
      >
        <Bell size={21} strokeWidth={2.1} />
        <span
          aria-hidden
          className="absolute right-[9px] top-[8px] h-[9px] w-[9px] rounded-full bg-[#F5453A] ring-2 ring-panel"
        />
      </motion.button>

      <span aria-hidden className="hidden h-[26px] w-px bg-line-strong tablet:block" />

      <button
        type="button"
        aria-label="Account menu for Jamie Chen"
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors duration-150 hover:bg-[#f5f7fb] tablet:pr-2"
      >
        <Image
          src="/assets/avatar-jamie.svg"
          alt="Jamie Chen"
          width={41}
          height={41}
          className="h-[41px] w-[41px] rounded-full ring-1 ring-line-strong"
        />
        <span className="hidden text-left leading-none desktop:block">
          <span className="block text-[15px] font-bold text-ink">Jamie Chen</span>
          <span className="mt-[3px] block text-[12.5px] font-medium text-muted">
            Columbia University
          </span>
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2.2}
          aria-hidden
          className="hidden text-faint desktop:block"
        />
      </button>
    </div>
  );
}
