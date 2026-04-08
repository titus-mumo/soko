import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
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
    const base = [
      "inline-flex cursor-pointer select-none items-center justify-center",
      "rounded font-medium text-sm leading-none transition-colors",
      "focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
      "focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950",
      "disabled:pointer-events-none disabled:opacity-50",
    ].join(" ");

    const variants: Record<string, string> = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
      secondary:
        "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:active:bg-zinc-600",
      ghost:
        "text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:active:bg-zinc-700",
    };

    const sizes: Record<string, string> = {
      sm: "h-7 px-2.5 text-xs",
      md: "h-9 px-4",
      lg: "h-10 px-5",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 h-3 w-3 shrink-0 animate-spin rounded-full border border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
