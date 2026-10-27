import { useEffect, useRef, useState } from "react";

/** The element's width, kept current — charts draw at real pixels. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A round axis maximum and its tick values (0 … max). */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** 0 / 950 / 1.2K / 3M */
export function compact(n: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** "14:00", or "Tue 14:00" when the range spans days. */
export function hourLabel(iso: string, withDay = false): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return withDay
    ? `${d.toLocaleDateString("en-KE", { weekday: "short" })} ${time}`
    : time;
}

/** Which x positions get a tick label, so labels never collide. */
export function tickEvery(points: number, width: number, labelPx = 56): number {
  const fit = Math.max(1, Math.floor(width / labelPx));
  const nice = [1, 2, 3, 4, 6, 12, 24, 48];
  return nice.find((n) => points / n <= fit) ?? Math.ceil(points / fit);
}
