import Link from "next/link";
import { cn } from "@/lib/utils";

/** Soko wordmark: a green mark + the name in Geist. */
export function Wordmark({
  href = "/",
  className,
  inverted = false,
}: {
  href?: string;
  className?: string;
  /** White text, for dark/green backgrounds. */
  inverted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 rounded-lg", className)}
      aria-label="Soko home"
    >
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 shadow-sm shadow-brand-900/30"
      >
        {/* A stylised market basket. */}
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="white"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 10h16l-1.6 8.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z" />
          <path d="M8 10 12 4l4 6" />
        </svg>
      </span>
      <span
        className={cn(
          "font-display text-lg font-bold tracking-[-0.03em]",
          inverted ? "text-white" : "text-zinc-950 dark:text-white",
        )}
      >
        soko
      </span>
    </Link>
  );
}
