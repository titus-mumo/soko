import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { Field, controlClasses, describedBy } from "./Field";

interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "prefix"
> {
  label?: string;
  /** Keep the label for screen readers but hide it visually. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  /** Leading adornment inside the field — an icon or "KES". */
  prefix?: React.ReactNode;
  /** Trailing adornment inside the field. */
  suffix?: React.ReactNode;
  inputSize?: "md" | "lg";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hideLabel = false,
      hint,
      error,
      prefix,
      suffix,
      inputSize = "md",
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
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500 dark:text-zinc-400">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(id, error, hint)}
            className={controlClasses({
              error: !!error,
              size: inputSize,
              className: cn(
                prefix != null && "pl-10",
                suffix != null && "pr-10",
                className,
              ),
            })}
            {...props}
          />
          {suffix && (
            <span className="absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500 dark:text-zinc-400">
              {suffix}
            </span>
          )}
        </div>
      </Field>
    );
  },
);

Input.displayName = "Input";
