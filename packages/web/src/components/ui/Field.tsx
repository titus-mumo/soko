import { cn } from "@/lib/utils";

/** Shared input chrome: border, background, focus ring, error state. */
export function controlClasses({
  error,
  size = "md",
  className,
}: {
  error?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  return cn(
    "w-full rounded-lg border bg-white text-zinc-900 placeholder:text-zinc-400",
    "dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
    "transition-[border-color,box-shadow] duration-150 ease-out",
    "focus:outline-none focus:ring-[3px]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "lg" ? "h-11 px-3.5 text-base" : "h-9 px-3 text-sm",
    error
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/25 dark:border-red-500"
      : "border-zinc-300 hover:border-zinc-400 focus:border-brand-600 focus:ring-brand-600/30 dark:border-zinc-700 dark:hover:border-zinc-600 dark:focus:border-brand-500",
    className,
  );
}

/** Label + control + hint/error, with ids wired for screen readers. */
export function Field({
  id,
  label,
  hideLabel,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label?: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "mb-1.5 text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
            hideLabel && "sr-only",
          )}
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 animate-fade-in text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria-describedby value for a control inside <Field>. */
export function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}
