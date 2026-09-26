"use client";

import { motion } from "framer-motion";
import { Minus, Navigation, Plus } from "lucide-react";

/**
 * Presentational map controls. Phase 2 wires these to the Mapbox camera; for
 * now they only carry hover and press states.
 */
export function MapControls() {
  return (
    <div className="absolute bottom-[103px] left-[17px] z-10 flex flex-col gap-[15px]">
      <ControlButton label="Recentre on my location">
        <Navigation size={19} strokeWidth={2.2} className="-rotate-[0deg]" />
      </ControlButton>

      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-pill">
        <ZoomButton label="Zoom in">
          <Plus size={18} strokeWidth={2.4} />
        </ZoomButton>
        <span aria-hidden className="mx-auto block h-px w-[26px] bg-line" />
        <ZoomButton label="Zoom out">
          <Minus size={18} strokeWidth={2.4} />
        </ZoomButton>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="grid h-[46px] w-[46px] place-items-center rounded-xl border border-line bg-panel text-[#3C4C6B] shadow-pill transition-colors duration-150 hover:text-brand"
    >
      {children}
    </motion.button>
  );
}

function ZoomButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-[34px] w-[46px] place-items-center text-[#3C4C6B] transition-colors duration-150 hover:bg-brand-tint hover:text-brand active:bg-brand-soft"
    >
      {children}
    </button>
  );
}
