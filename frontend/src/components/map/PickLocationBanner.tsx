"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPin } from "lucide-react";

/** Instruction shown while the user is choosing an event location on the map. */
export function PickLocationBanner({ visible, onCancel }: { visible: boolean; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute left-1/2 top-4 z-20 flex w-max max-w-[92%] -translate-x-1/2 items-center gap-3 rounded-full bg-ink py-[7px] pl-[16px] pr-[7px] text-[14px] font-semibold text-white shadow-float"
        >
          <MapPin size={16} strokeWidth={2.4} aria-hidden className="shrink-0" />
          <span className="min-w-0">Tap the map where your event is happening</span>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-full bg-white/15 px-3 py-[6px] text-[13px] font-bold transition-colors hover:bg-white/25"
          >
            Cancel
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
