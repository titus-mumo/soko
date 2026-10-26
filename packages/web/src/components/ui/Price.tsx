import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  n.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

/**
 * KES amount in Geist Mono. `accent` makes it brand green — reserve that for
 * the price that matters most on a screen.
 */
export function Price({
  amount,
  compareAt,
  accent = false,
  size = "md",
  className,
}: {
  amount: number | string | null | undefined;
  /** Original price; shown struck through when higher than amount. */
  compareAt?: number | string | null;
  accent?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const value = Number(amount ?? 0);
  const was = compareAt != null ? Number(compareAt) : null;
  const discounted = was !== null && was > value;

  return (
    <span
      className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}
    >
      <span
        className={cn(
          "tabular font-mono font-semibold",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-xl",
          size === "xl" && "text-3xl",
          accent
            ? "text-brand-600 dark:text-brand-500"
            : "text-zinc-900 dark:text-zinc-50",
        )}
      >
        <span className="mr-1 text-[0.7em] font-medium opacity-70">KES</span>
        {fmt(value)}
      </span>
      {discounted && (
        <span className="tabular font-mono text-[0.8em] text-zinc-500 line-through">
          <span className="sr-only">was </span>
          {fmt(was)}
        </span>
      )}
    </span>
  );
}
