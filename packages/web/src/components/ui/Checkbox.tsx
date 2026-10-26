import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
  /** Keep the label for screen readers but hide it visually. */
  hideLabel?: boolean;
  description?: React.ReactNode;
  /** Shows a dash — e.g. "some rows selected". */
  indeterminate?: boolean;
}

/**
 * A native checkbox (keyboard, forms and react-hook-form all just work)
 * visually replaced by a custom box with a green check.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      hideLabel,
      description,
      indeterminate,
      className,
      id: idProp,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <label
        htmlFor={id}
        className={cn(
          "tap-target group inline-flex cursor-pointer items-start gap-2.5",
          props.disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span className="relative mt-0.5 flex h-4 w-4 shrink-0">
          <input
            ref={(el) => {
              if (el) el.indeterminate = !!indeterminate;
              if (typeof ref === "function") ref(el);
              else if (ref) ref.current = el;
            }}
            id={id}
            type="checkbox"
            className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded border border-zinc-300 bg-white transition-colors duration-150 checked:border-brand-600 checked:bg-brand-600 indeterminate:border-brand-600 indeterminate:bg-brand-600 disabled:cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-900 dark:checked:border-brand-500 dark:checked:bg-brand-500"
            {...props}
          />
          {/* Check */}
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 scale-50 text-white opacity-0 transition-all duration-150 peer-checked:scale-100 peer-checked:opacity-100 peer-indeterminate:opacity-0"
          >
            <path
              d="M4 8.5l2.5 2.5L12 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {/* Dash (indeterminate) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-2 -translate-x-1/2 -translate-y-1/2 rounded bg-white opacity-0 peer-indeterminate:opacity-100"
          />
        </span>
        {(label || description) && (
          <span className={cn("min-w-0", hideLabel && "sr-only")}>
            {label && (
              <span className="block text-sm text-zinc-800 dark:text-zinc-200">
                {label}
              </span>
            )}
            {description && (
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {description}
              </span>
            )}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
