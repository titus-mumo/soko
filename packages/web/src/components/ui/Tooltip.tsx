import { cn } from "@/lib/utils";

const SIDE = {
  right: "left-full top-1/2 ml-3 -translate-y-1/2",
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
} as const;

/**
 * Hover/focus label for an icon-only control. CSS only. The wrapped
 * control must still carry its own accessible name (aria-label or sr-only
 * text) — the tooltip is visual and hidden from assistive tech.
 */
export function Tooltip({
  label,
  side = "top",
  disabled = false,
  children,
  className,
}: {
  label: string;
  side?: keyof typeof SIDE;
  /** Render just the children (e.g. when the label is already visible). */
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (disabled) return <>{children}</>;
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-[60] whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-100 opacity-0 shadow-lg transition-opacity duration-150",
          "group-hover/tooltip:opacity-100 group-has-[:focus-visible]/tooltip:opacity-100",
          SIDE[side],
        )}
      >
        {label}
      </span>
    </span>
  );
}
