"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={filled ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

/** Read-only rating. Announced as text, not just colour. */
export function Stars({
  rating,
  size = 14,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating.toFixed(1).replace(/\.0$/, "")} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} filled={i < rounded} size={size} />
      ))}
    </span>
  );
}

/** Interactive 1–5 picker, operable by keyboard (radio group semantics). */
export function StarPicker({
  value,
  onChange,
  label = "Rating",
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            className="rounded"
          >
            <Star filled={n <= (hovered || value)} size={22} />
          </button>
        );
      })}
    </div>
  );
}
