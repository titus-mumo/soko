import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

/** Inline error banner for forms. Announced to screen readers. */
export function FormError({
  message,
  className,
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "flex animate-fade-in items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
        className,
      )}
    >
      <Icon name="alert" size={16} className="mt-0.5" />
      <span>{message}</span>
    </p>
  );
}
