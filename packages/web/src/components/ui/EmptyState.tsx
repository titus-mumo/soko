import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";

/** Centred icon, heading, short explanation and an optional call to action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  titleAs: Heading = "h2",
  className,
}: {
  icon: IconName;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Less vertical padding, for empty sections inside a page. */
  compact?: boolean;
  /** Heading level for the title, to keep the page's h1→h2→h3 order. */
  titleAs?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      <Icon
        name={icon}
        size={48}
        strokeWidth={1.25}
        className="text-zinc-300 dark:text-zinc-700"
      />
      <Heading className="mt-4 font-sans text-base font-medium tracking-normal text-zinc-700 dark:text-zinc-300">
        {title}
      </Heading>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-zinc-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
