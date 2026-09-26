"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SearchX } from "lucide-react";

/** Shown over the map when the active search/filters hide every event. */
export function MapEmptyState({
  visible,
  message,
  onReset,
}: {
  visible: boolean;
  message: string;
  onReset: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute left-1/2 top-[76px] z-10 flex w-max max-w-[92%] -translate-x-1/2 items-center gap-3 rounded-[14px] border border-line bg-panel py-[9px] pl-[13px] pr-[9px] text-[13.5px] font-medium text-ink-soft shadow-float"
        >
          <SearchX size={16} strokeWidth={2.3} aria-hidden className="shrink-0 text-faint" />
          <span className="min-w-0">{message}</span>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-[9px] bg-brand-tint px-[10px] py-[5px] text-[13px] font-bold text-brand transition-colors hover:bg-brand-soft"
          >
            Show all events
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
