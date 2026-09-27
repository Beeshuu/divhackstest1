"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Navigation, X } from "lucide-react";

import { appleDirectionsUrl, googleDirectionsUrl } from "@/lib/directions";
import type { LatLng } from "@/lib/geo";
import type { CampusEvent } from "@/types/event";

interface DirectionsPromptProps {
  event: CampusEvent | null;
  origin?: LatLng | null;
  onClose: () => void;
}

function openMaps(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Asks whether to open walking directions in Apple Maps or Google Maps. */
export function DirectionsPrompt({ event, origin, onClose }: DirectionsPromptProps) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-ink/30 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label="Dismiss directions"
            onClick={onClose}
            className="absolute inset-0 cursor-default"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="directions-prompt-title"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[400px] rounded-[20px] border border-line bg-panel p-5 shadow-float"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-faint transition-colors hover:bg-[#f0f3f9] hover:text-ink"
            >
              <X size={16} strokeWidth={2.4} />
            </button>

            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-tint text-brand">
              <Navigation size={18} strokeWidth={2.2} aria-hidden className="fill-brand" />
            </span>
            <h2
              id="directions-prompt-title"
              className="mt-3 pr-8 text-[20px] font-extrabold leading-tight tracking-[-0.02em] text-ink"
            >
              Open directions?
            </h2>
            <p className="mt-1.5 text-[14.5px] font-medium leading-[1.4] text-muted">
              Get walking directions to {event.title} at {event.locationName} in Apple Maps or
              Google Maps.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  openMaps(appleDirectionsUrl(event, origin));
                  onClose();
                }}
                className="flex h-[44px] items-center justify-center rounded-[13px] bg-brand text-[15px] font-bold text-white shadow-[0_4px_12px_rgb(23_102_232_/_0.22)] transition-colors hover:bg-brand-dark"
              >
                Apple Maps
              </button>
              <button
                type="button"
                onClick={() => {
                  openMaps(googleDirectionsUrl(event, origin));
                  onClose();
                }}
                className="flex h-[44px] items-center justify-center rounded-[13px] bg-brand-soft text-[15px] font-bold text-brand transition-colors hover:bg-[#dde8fa]"
              >
                Google Maps
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-[40px] items-center justify-center text-[14px] font-semibold text-muted transition-colors hover:text-ink"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
