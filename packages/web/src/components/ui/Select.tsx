import { SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, placeholder, children, id: idProp, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "h-9 w-full appearance-none rounded border px-3 text-sm",
            "bg-white text-zinc-900",
            "border-zinc-200",
            "dark:bg-zinc-900 dark:text-zinc-50",
            "dark:border-zinc-800",
            "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-400 focus:ring-red-500 dark:border-red-600",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
