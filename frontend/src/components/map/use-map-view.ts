"use client";

import {
  animate,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MapPoint } from "@/lib/geo";

const MIN_SCALE = 1;
const MAX_SCALE = 3;
/** How far past the drawn edge the map may be dragged, in screen px. */
const PAN_SLACK = 160;
const TAP_TOLERANCE = 5;
const EASE = [0.32, 0.72, 0, 1] as const;

export interface MapView {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  /** 1 / scale — keeps pins and labels a constant size while zooming. */
  inverseScale: MotionValue<number>;
  isDragging: boolean;
  zoomBy: (factor: number) => void;
  centerOn: (point: MapPoint, zoom?: number) => void;
  reset: () => void;
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Pan / zoom state for the placeholder map. The map layer is transformed with
 * `translate(x, y) scale(s)` from its top-left corner, so a map-local point `m`
 * lands on screen at `x + s * m`.
 */
export function useMapView(onTap?: (point: MapPoint) => void): MapView {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const inverseScale = useTransform(scale, (s) => 1 / s);
  const [isDragging, setIsDragging] = useState(false);

  const running = useRef<AnimationPlaybackControls[]>([]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, startX: 0, startY: 0, pinchDist: 0 });
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  const size = () => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return { w: rect?.width ?? 1, h: rect?.height ?? 1, left: rect?.left ?? 0, top: rect?.top ?? 0 };
  };

  const clampTranslate = useCallback((tx: number, ty: number, s: number) => {
    const { w, h } = size();
    return {
      x: clamp(tx, w - w * s - PAN_SLACK, PAN_SLACK),
      y: clamp(ty, h - h * s - PAN_SLACK, PAN_SLACK),
    };
  }, []);

  const stop = () => {
    running.current.forEach((c) => c.stop());
    running.current = [];
  };

  const animateTo = useCallback((tx: number, ty: number, s: number) => {
    stop();
    const next = clampTranslate(tx, ty, s);
    const opts = { duration: 0.38, ease: EASE };
    running.current = [animate(x, next.x, opts), animate(y, next.y, opts), animate(scale, s, opts)];
  }, [clampTranslate, x, y, scale]);

  /** Zooms keeping the screen point (px, py) — relative to the viewport — fixed. */
  const zoomAround = useCallback(
    (factor: number, px: number, py: number, animated: boolean) => {
      const s0 = scale.get();
      const s1 = clamp(s0 * factor, MIN_SCALE, MAX_SCALE);
      if (s1 === s0) return;
      const tx = px - ((px - x.get()) * s1) / s0;
      const ty = py - ((py - y.get()) * s1) / s0;
      if (animated) {
        animateTo(tx, ty, s1);
        return;
      }
      stop();
      const next = clampTranslate(tx, ty, s1);
      scale.set(s1);
      x.set(next.x);
      y.set(next.y);
    },
    [animateTo, clampTranslate, scale, x, y],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const { w, h } = size();
      zoomAround(factor, w / 2, h / 2, true);
    },
    [zoomAround],
  );

  const centerOn = useCallback(
    (point: MapPoint, zoom?: number) => {
      const { w, h } = size();
      const s = clamp(zoom ?? Math.max(scale.get(), 1.6), MIN_SCALE, MAX_SCALE);
      animateTo(w / 2 - (s * w * point.x) / 100, h / 2 - (s * h * point.y) / 100, s);
    },
    [animateTo, scale],
  );

  const reset = useCallback(() => animateTo(0, 0, 1), [animateTo]);

  // Wheel / trackpad zoom needs a non-passive listener to stop page zoom.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { left, top } = size();
      const sensitivity = e.ctrlKey ? 0.012 : 0.0022;
      zoomAround(Math.exp(-e.deltaY * sensitivity), e.clientX - left, e.clientY - top, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAround]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    stop();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { moved: false, startX: e.clientX, startY: e.clientY, pinchDist: 0 };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.moved = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinchDist > 0) {
        const { left, top } = size();
        zoomAround(dist / gesture.current.pinchDist, (a.x + b.x) / 2 - left, (a.y + b.y) / 2 - top, false);
      }
      gesture.current.pinchDist = dist;
      return;
    }

    const g = gesture.current;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < TAP_TOLERANCE) return;
    if (!g.moved) {
      g.moved = true;
      setIsDragging(true);
    }
    const next = clampTranslate(x.get() + e.clientX - prev.x, y.get() + e.clientY - prev.y, scale.get());
    x.set(next.x);
    y.set(next.y);
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) return;
    setIsDragging(false);
    if (!cancelled && !gesture.current.moved && onTapRef.current) {
      const { w, h, left, top } = size();
      const s = scale.get();
      onTapRef.current({
        x: (((e.clientX - left - x.get()) / s) / w) * 100,
        y: (((e.clientY - top - y.get()) / s) / h) * 100,
      });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = 80;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (pan[e.key]) {
      e.preventDefault();
      const [dx, dy] = pan[e.key];
      animateTo(x.get() + dx, y.get() + dy, scale.get());
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomBy(1.4);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomBy(1 / 1.4);
    }
  };

  return {
    viewportRef,
    x,
    y,
    scale,
    inverseScale,
    isDragging,
    zoomBy,
    centerOn,
    reset,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e) => endPointer(e, false),
      onPointerCancel: (e) => endPointer(e, true),
      onKeyDown,
    },
  };
}
