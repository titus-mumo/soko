import { SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { Field, controlClasses, describedBy } from "./Field";
import { Icon } from "./Icon";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  /** Keep the label for screen readers but hide it visually. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  selectSize?: "md" | "lg";
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      hideLabel = false,
      hint,
      error,
      placeholder,
      selectSize = "md",
      children,
      id: idProp,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <Field
        id={id}
        label={label}
        hideLabel={hideLabel}
        hint={hint}
        error={error}
      >
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(id, error, hint)}
            className={controlClasses({
              error: !!error,
              size: selectSize,
              className: cn("cursor-pointer appearance-none pr-9", className),
            })}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <Icon
            name="chevron-down"
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
          />
        </div>
      </Field>
    );
  },
);

Select.displayName = "Select";
