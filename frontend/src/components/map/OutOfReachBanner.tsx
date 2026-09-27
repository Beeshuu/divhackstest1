"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPinOff, X } from "lucide-react";

/** Shown when the browser has a location that falls outside the campus map. */
export function OutOfReachBanner({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute left-1/2 top-[72px] z-20 flex w-[min(92%,420px)] -translate-x-1/2 items-start gap-3 rounded-[16px] border border-line bg-panel py-[11px] pl-[14px] pr-[8px] text-[14px] font-medium leading-[1.4] text-ink-soft shadow-float"
        >
          <MapPinOff size={18} strokeWidth={2.2} aria-hidden className="mt-[1px] shrink-0 text-coral" />
          <span className="min-w-0">
            You&apos;re out of reach — your live location is outside the campus map, so your marker
            is hidden.
          </span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss out of reach message"
            className="-mt-[2px] grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-[#f0f3f9] hover:text-ink"
          >
            <X size={14} strokeWidth={2.6} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
