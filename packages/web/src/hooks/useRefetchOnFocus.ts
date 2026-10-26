"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `refetch` when the tab becomes visible again, at most once per
 * `minIntervalMs`, so lists stay fresh after the buyer pays on their phone or
 * switches tabs. Does not run on mount — load initially yourself.
 */
export function useRefetchOnFocus(refetch: () => void, minIntervalMs = 15_000) {
  const latest = useRef(refetch);
  latest.current = refetch;
  const last = useRef(Date.now());

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last.current < minIntervalMs) return;
      last.current = Date.now();
      latest.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [minIntervalMs]);
}
