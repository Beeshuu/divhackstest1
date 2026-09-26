"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "lucide-react";

import type { Toast } from "@/lib/use-campus-state";

/** Subtle status message floating above the stats bar. */
export function MapToast({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute bottom-[118px] left-1/2 z-20 w-[min(92%,460px)] -translate-x-1/2"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto mx-auto flex w-fit max-w-full items-start gap-[9px] rounded-[14px] border border-line bg-panel py-[10px] pl-[13px] pr-[8px] text-[13.5px] font-medium leading-[1.4] text-ink-soft shadow-float"
          >
            <Info size={16} strokeWidth={2.3} aria-hidden className="mt-[1px] shrink-0 text-brand" />
            <span className="min-w-0">{toast.message}</span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss message"
              className="-my-[2px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-[#f0f3f9] hover:text-ink"
            >
              <X size={13} strokeWidth={2.6} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
