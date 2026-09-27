"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Crown, LogOut, Menu, Search, Settings, UserRound, X } from "lucide-react";

import { GeminiSparkle } from "@/components/gemini/GeminiSparkle";
import { CategoryGlyph } from "@/components/icons/CategoryIcons";
import { NotificationMenu, type NotificationAction } from "@/components/layout/NotificationMenu";
import { useAuth } from "@/lib/auth";
import { initialsOf } from "@/lib/utils";
import type { CampusEvent } from "@/types/event";
import type { AccountView } from "@/components/account/AccountPanel";

interface SearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Events matching the current query and filters. */
  results: CampusEvent[];
  onSelectResult: (event: CampusEvent) => void;
}

interface TopNavbarProps extends SearchProps {
  onOpenSidebar: () => void;
  onAskGemini: () => void;
  events: CampusEvent[];
  onNotificationAction: (action: NotificationAction) => void;
  onOpenAccount: (view: AccountView) => void;
}

/**
 * Fixed-height application header: brand block, local event search and the
 * account cluster. Search only looks at events already in the browser.
 */
export function TopNavbar({
  onOpenSidebar,
  onAskGemini,
  events,
  onNotificationAction,
  onOpenAccount,
  ...search
}: TopNavbarProps) {
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

      <div className="min-w-0 flex-1 overflow-hidden pl-2 pr-3 tablet:pl-6 desktop:pl-8">
        <SearchField {...search} />
      </div>

      <AccountCluster
        onAskGemini={onAskGemini}
        events={events}
        onSelectEvent={search.onSelectResult}
        onNotificationAction={onNotificationAction}
        onOpenAccount={onOpenAccount}
      />
    </header>
  );
}

function SearchField({ query, onQueryChange, results, onSelectResult }: SearchProps) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const open = focused && query.trim().length > 0;
  const shown = results.slice(0, 6);

  const choose = (event: CampusEvent) => {
    onSelectResult(event);
    setFocused(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && shown[active]) {
      e.preventDefault();
      choose(shown[active]);
    } else if (e.key === "Escape") {
      onQueryChange("");
    }
  };

  return (
    <div className="relative w-full max-w-[620px]">
      <Search
        size={18}
        strokeWidth={2.2}
        aria-hidden
        className="pointer-events-none absolute left-[17px] top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Search events, locations, people, or clubs"
        placeholder="Search events, locations, people, or clubs..."
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setActive(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        className={`h-11 w-full cursor-text rounded-full border border-transparent bg-field pl-[46px] ${query ? "pr-10" : "pr-4"} text-[15px] font-medium text-ink placeholder:font-normal placeholder:text-faint transition-colors duration-150 hover:bg-[#edf0f6] focus:border-brand/30 focus:bg-white focus:outline-none [&::-webkit-search-cancel-button]:hidden`}
      />
      {query && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Clear search"
          className="absolute right-[10px] top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-faint transition-colors hover:bg-[#e6eaf2] hover:text-ink"
        >
          <X size={14} strokeWidth={2.6} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-[16px] border border-line bg-panel p-1.5 shadow-float"
          >
            {shown.length === 0 ? (
              <li className="px-3 py-3 text-[14px] font-medium text-muted">
                No events match &ldquo;{query.trim()}&rdquo;.
              </li>
            ) : (
              shown.map((event, index) => (
                <li key={event.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    // Keep focus on the input so blur doesn't close the list first.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(event)}
                    onMouseEnter={() => setActive(index)}
                    className={`flex w-full items-center gap-3 rounded-[11px] px-3 py-[9px] text-left transition-colors duration-100 ${
                      index === active ? "bg-brand-tint" : ""
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-field">
                      <CategoryGlyph category={event.category} size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-bold text-ink">
                        {event.title}
                      </span>
                      <span className="block truncate text-[12.5px] font-medium text-muted">
                        {event.locationName} · {event.category} · {event.host}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountCluster({
  onAskGemini,
  events,
  onSelectEvent,
  onNotificationAction,
  onOpenAccount,
}: {
  onAskGemini: () => void;
  events: CampusEvent[];
  onSelectEvent: (event: CampusEvent) => void;
  onNotificationAction: (action: NotificationAction) => void;
  onOpenAccount: (view: AccountView) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 pr-4 tablet:gap-3.5 tablet:pr-[25px]">
      <motion.button
        type="button"
        onClick={onAskGemini}
        aria-label="Ask Gemini"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-ink-soft transition-colors duration-150 hover:bg-[#f3eefe] hover:text-[#6D28D9] tablet:flex"
      >
        <GeminiSparkle size={18} />
        <span className="text-[14px] font-bold">Ask Gemini</span>
      </motion.button>

      <NotificationMenu events={events} onSelectEvent={onSelectEvent} onAction={onNotificationAction} />

      <span aria-hidden className="hidden h-[26px] w-px bg-line-strong tablet:block" />

      <AccountMenu onOpenAccount={onOpenAccount} />
    </div>
  );
}

function AccountMenu({ onOpenAccount }: { onOpenAccount: (view: AccountView) => void }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const name = user?.name ?? "Your account";
  const college = user?.college ?? "Campus Connect";

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors duration-150 hover:bg-[#f5f7fb] tablet:pr-2"
      >
        <span
          aria-hidden
          className="grid h-[41px] w-[41px] shrink-0 place-items-center rounded-full bg-brand text-[15px] font-bold text-white ring-1 ring-line-strong"
        >
          {initialsOf(name)}
        </span>
        <span className="hidden max-w-[150px] text-left leading-none desktop:block">
          <span className="block truncate text-[15px] font-bold text-ink">{name}</span>
          <span className="mt-[3px] block truncate text-[12.5px] font-medium text-muted">
            {college}
          </span>
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2.2}
          aria-hidden
          className={`hidden text-faint transition-transform desktop:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-[52px] z-50 w-[248px] overflow-hidden rounded-[16px] border border-line bg-panel p-1.5 shadow-float"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-[14.5px] font-bold text-ink">{name}</p>
              <p className="mt-[3px] truncate text-[12.5px] font-medium text-muted">
                {user?.email ?? user?.phone ?? college}
              </p>
            </div>
            <div aria-hidden className="mx-2 h-px bg-line" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenAccount("profile");
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded-[11px] px-3 py-[9px] text-left text-[14.5px] font-semibold text-ink transition-colors duration-100 hover:bg-brand-tint hover:text-brand"
            >
              <UserRound size={17} strokeWidth={2.2} aria-hidden />
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenAccount("settings");
              }}
              className="flex w-full items-center gap-2.5 rounded-[11px] px-3 py-[9px] text-left text-[14.5px] font-semibold text-ink transition-colors duration-100 hover:bg-brand-tint hover:text-brand"
            >
              <Settings size={17} strokeWidth={2.2} aria-hidden />
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-[11px] px-3 py-[9px] text-left text-[14.5px] font-semibold text-ink transition-colors duration-100 hover:bg-brand-tint hover:text-brand"
            >
              <LogOut size={17} strokeWidth={2.2} aria-hidden />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
