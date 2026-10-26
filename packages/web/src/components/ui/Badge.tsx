import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "indigo"
  | "purple";

// "default" and "zinc" are kept as aliases so existing call sites keep working.
type LegacyVariant = "default" | "zinc";

// Light: tinted -50 bg with -700 text. Dark: -500/15 bg with -400 text.
const SUBTLE: Record<BadgeTone, string> = {
  neutral:
    "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-400 dark:ring-transparent",
  brand:
    "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-transparent",
  success:
    "bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/15 dark:text-green-400 dark:ring-transparent",
  warning:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-transparent",
  error:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-400 dark:ring-transparent",
  info: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-transparent",
  indigo:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:ring-transparent",
  purple:
    "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:ring-transparent",
};

const SOLID: Record<BadgeTone, string> = {
  neutral: "bg-zinc-700 text-white",
  brand: "bg-brand-600 text-white",
  success: "bg-green-600 text-white",
  warning: "bg-amber-500 text-zinc-950",
  error: "bg-red-600 text-white",
  info: "bg-blue-600 text-white",
  indigo: "bg-indigo-600 text-white",
  purple: "bg-purple-600 text-white",
};

const DOT: Record<BadgeTone, string> = {
  neutral: "bg-zinc-400",
  brand: "bg-brand-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
};

interface BadgeProps {
  children: React.ReactNode;
  /** Colour. `variant` is the older name for the same thing. */
  tone?: BadgeTone;
  variant?: BadgeTone | LegacyVariant;
  appearance?: "subtle" | "solid";
  size?: "sm" | "md";
  /** Pill (status) vs. squarer chip (categories). */
  shape?: "pill" | "rounded";
  /** Leading status dot. */
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  tone,
  variant,
  appearance = "subtle",
  size = "md",
  shape = "pill",
  dot = false,
  className,
}: BadgeProps) {
  const resolved: BadgeTone =
    tone ??
    (variant === "default" || variant === "zinc" || !variant
      ? "neutral"
      : variant);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap font-medium",
        shape === "pill" ? "rounded-full" : "rounded-md",
        size === "sm" ? "px-1.5 py-px text-2xs" : "px-2 py-0.5 text-xs",
        appearance === "solid"
          ? SOLID[resolved]
          : cn("ring-1 ring-inset", SUBTLE[resolved]),
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            appearance === "solid" ? "bg-current opacity-80" : DOT[resolved],
          )}
        />
      )}
      {children}
    </span>
  );
}
