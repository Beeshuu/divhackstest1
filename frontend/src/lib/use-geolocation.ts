"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LatLng } from "./geo";

export type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface GeoResult {
  status: GeoStatus;
  position: LatLng | null;
}

export interface GeolocationState extends GeoResult {
  /**
   * Asks for location the first time it is called, then keeps watching.
   * Concurrent callers share the in-flight request. A browser denial can be
   * retried from a later user gesture — the browser will not re-prompt if the
   * permission is actually blocked.
   */
  request: () => Promise<GeoResult>;
}

/**
 * Browser geolocation held in memory only — never sent anywhere or persisted.
 * Nothing is requested until a location-dependent control calls `request()`.
 */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [position, setPosition] = useState<LatLng | null>(null);
  const watchId = useRef<number | null>(null);
  const statusRef = useRef<GeoStatus>("idle");
  const positionRef = useRef<LatLng | null>(null);
  const inflight = useRef<Promise<GeoResult> | null>(null);

  const update = useCallback((next: GeoStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  const request = useCallback((): Promise<GeoResult> => {
    const settled = (next: GeoStatus) => Promise.resolve({ status: next, position: positionRef.current });
    if (inflight.current) return inflight.current;

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      update("unavailable");
      return settled("unavailable");
    }

    update("requesting");
    const pending = new Promise<GeoResult>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          positionRef.current = next;
          setPosition(next);
          update("granted");
          resolve({ status: "granted", position: next });

          if (watchId.current === null) {
            watchId.current = navigator.geolocation.watchPosition(
              (p) => {
                const moved = { lat: p.coords.latitude, lng: p.coords.longitude };
                positionRef.current = moved;
                setPosition(moved);
              },
              () => undefined,
              { enableHighAccuracy: true, maximumAge: 10_000 },
            );
          }
        },
        (error) => {
          if (positionRef.current) {
            update("granted");
            resolve({ status: "granted", position: positionRef.current });
            return;
          }
          const next = error.code === error.PERMISSION_DENIED ? "denied" : "unavailable";
          update(next);
          resolve({ status: next, position: null });
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
      );
    });
    inflight.current = pending;
    void pending.finally(() => {
      if (inflight.current === pending) inflight.current = null;
    });
    return pending;
  }, [update]);

  return { status, position, request };
}
