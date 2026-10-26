"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastItem } from "@/store/toast.store";
import { Icon, type IconName } from "./Icon";

const DEFAULT_DURATION = 4000;

const TONE: Record<
  ToastItem["type"],
  { border: string; icon: IconName; iconColor: string; bar: string }
> = {
  success: {
    border: "border-l-green-500",
    icon: "check",
    iconColor: "text-green-600 dark:text-green-400",
    bar: "bg-green-500",
  },
  error: {
    border: "border-l-red-500",
    icon: "alert",
    iconColor: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
  },
  info: {
    border: "border-l-blue-500",
    icon: "info",
    iconColor: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
  },
};

function ToastEntry({ toast }: { toast: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  const duration = toast.duration ?? DEFAULT_DURATION;
  const [paused, setPaused] = useState(false);
  // Time left survives pausing (hover / focus) and resuming.
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = setTimeout(() => remove(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, toast.id, remove]);

  const tone = TONE[toast.type];

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "relative flex animate-toast-in items-start gap-3 overflow-hidden rounded-xl border border-l-[3px] bg-white py-3 pl-3.5 pr-2 text-sm shadow-2xl shadow-zinc-950/10",
        "border-zinc-200 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/40",
        tone.border,
      )}
    >
      <Icon
        name={tone.icon}
        size={16}
        className={cn("mt-0.5", tone.iconColor)}
      />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => remove(toast.id)}
        className="tap-target -my-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Dismiss notification"
      >
        <Icon name="x" size={14} />
      </button>
      {/* Time remaining */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-full origin-left animate-progress opacity-60",
          tone.bar,
        )}
        style={{
          animationDuration: `${duration}ms`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  // The live region stays mounted so screen readers announce new toasts.
  // On mobile it sits above the bottom tab bar.
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-4 bottom-20 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:w-full sm:max-w-sm md:bottom-6"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastEntry toast={t} />
        </div>
      ))}
    </div>
  );
}
