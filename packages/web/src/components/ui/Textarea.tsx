"use client";

import {
  TextareaHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import { Field, controlClasses, describedBy } from "./Field";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Keep the label for screen readers but hide it visually. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  /** Grow with content instead of scrolling (default on). */
  autoGrow?: boolean;
}

/** Textarea that grows to fit its content. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      hideLabel = false,
      hint,
      error,
      autoGrow = true,
      rows = 3,
      id: idProp,
      onChange,
      ...props
    },
    forwardedRef,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoGrow) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [autoGrow]);

    // Fit initial / externally-set values (react-hook-form resets, edits).
    useEffect(resize, [resize, props.value, props.defaultValue]);

    const setRefs = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    };

    return (
      <Field
        id={id}
        label={label}
        hideLabel={hideLabel}
        hint={hint}
        error={error}
      >
        <textarea
          ref={setRefs}
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          onChange={(e) => {
            onChange?.(e);
            resize();
          }}
          className={controlClasses({
            error: !!error,
            className: cn(
              "h-auto py-2 leading-relaxed",
              autoGrow ? "resize-none overflow-hidden" : "resize-y",
              className,
            ),
          })}
          {...props}
        />
      </Field>
    );
  },
);

Textarea.displayName = "Textarea";
