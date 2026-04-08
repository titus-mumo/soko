"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastItem } from "@/store/toast.store";

// ─── Individual toast ─────────────────────────────────────────────────────────

function ToastEntry({ toast }: { toast: ToastItem }) {
  const remove = useToastStore((s) => s.remove);

  useEffect(() => {
    const timer = setTimeout(() => remove(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, remove]);

  const styles: Record<ToastItem["type"], string> = {
    success:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300",
    error:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
    info: "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
  };

  const icons: Record<ToastItem["type"], React.ReactNode> = {
    success: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
    error: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6M9 9l6 6" />
      </svg>
    ),
    info: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 text-sm",
        styles[toast.type],
      )}
      role="alert"
    >
      <span className="mt-px shrink-0">{icons[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => remove(toast.id)}
        className="ml-2 shrink-0 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Container (rendered in layout) ──────────────────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastEntry key={t.id} toast={t} />
      ))}
    </div>
  );
}
