import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

/** Fieldset that names a group of <Radio>s or <RadioCard>s. */
export function RadioGroup({
  label,
  hideLabel,
  error,
  children,
  className,
}: {
  label: string;
  hideLabel?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend
        className={cn(
          "mb-2 text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </legend>
      <div className="space-y-2">{children}</div>
      {error && (
        <p className="mt-1.5 animate-fade-in text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </fieldset>
  );
}

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
};

/** Native radio, custom drawn: ring with a green dot. */
function RadioDot({
  inputProps,
}: {
  inputProps: React.ComponentProps<"input">;
}) {
  return (
    <span className="relative mt-0.5 flex h-4 w-4 shrink-0">
      <input
        type="radio"
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-full border border-zinc-300 bg-white transition-colors duration-150 checked:border-brand-600 dark:border-zinc-600 dark:bg-zinc-900 dark:checked:border-brand-500"
        {...inputProps}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[3px] scale-0 rounded-full bg-brand-600 transition-transform duration-150 peer-checked:scale-100 dark:bg-brand-500"
      />
    </span>
  );
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, className, id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    return (
      <label
        htmlFor={id}
        className={cn(
          "tap-target inline-flex cursor-pointer items-start gap-2.5",
          className,
        )}
      >
        <RadioDot inputProps={{ ...props, id, ref }} />
        <span className="min-w-0">
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
      </label>
    );
  },
);
Radio.displayName = "Radio";

/** A selectable card — a whole bordered row acting as one radio option. */
export const RadioCard = forwardRef<
  HTMLInputElement,
  RadioProps & { aside?: React.ReactNode }
>(({ label, description, aside, className, id: idProp, ...props }, ref) => {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition-colors duration-150",
        "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
        "has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/40 dark:has-[:checked]:border-brand-500 dark:has-[:checked]:bg-brand-500/5",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-zinc-950",
        className,
      )}
    >
      <RadioDot inputProps={{ ...props, id, ref }} />
      <span className="min-w-0 flex-1">
        {label && (
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {label}
          </span>
        )}
        {description && (
          <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </span>
        )}
      </span>
      {aside}
    </label>
  );
});
RadioCard.displayName = "RadioCard";
