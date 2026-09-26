"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Minimal media-query hook used only to pick a drawer animation axis
 * (slide from the right on desktop, slide up as a sheet on small screens).
 * The server snapshot is `false` so server and first client render agree.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
