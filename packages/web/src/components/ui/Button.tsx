import { ButtonHTMLAttributes, forwardRef } from "react";
import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const base = [
  "tap-target relative inline-flex cursor-pointer select-none items-center justify-center gap-2",
  "whitespace-nowrap rounded-lg font-medium leading-none",
  "transition-[color,background-color,border-color,transform] duration-150 ease-out",
  "active:scale-[0.98]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950",
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
].join(" ");

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 dark:hover:bg-brand-500",
  secondary:
    "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
  danger: "bg-red-600 text-white hover:bg-red-500 active:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

/** Class string for anything that should look like a button. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </span>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={buttonClasses({ variant, size, className })}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Spinner />}
        {/* The label keeps its space while loading so the button doesn't jump. */}
        <span
          className={cn(
            "inline-flex items-center gap-2",
            isLoading && "invisible",
          )}
        >
          {children}
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";

/**
 * A link styled as a button. Use instead of wrapping <Button> in <Link> —
 * nesting a button inside a link is invalid and confuses assistive tech.
 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: LinkProps & {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {children}
    </Link>
  );
}

/** Square icon-only button. `label` is required — it's the accessible name. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "children"> & { label: string; children: React.ReactNode }
>(({ label, className, variant = "ghost", size = "md", ...props }, ref) => (
  <Button
    ref={ref}
    variant={variant}
    size={size}
    aria-label={label}
    title={label}
    className={cn(
      size === "sm" ? "w-7 px-0" : size === "lg" ? "w-11 px-0" : "w-9 px-0",
      className,
    )}
    {...props}
  />
));

IconButton.displayName = "IconButton";
