import { TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id: idProp, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={id}
          rows={4}
          className={cn(
            "w-full resize-y rounded border px-3 py-2 text-sm",
            "bg-white text-zinc-900 placeholder:text-zinc-400",
            "border-zinc-200",
            "dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-600",
            "dark:border-zinc-800",
            "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-400 focus:ring-red-500 dark:border-red-600",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
