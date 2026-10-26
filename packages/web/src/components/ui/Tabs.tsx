"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabDef {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

/** WAI-ARIA tabs: arrow keys move between tabs, panels are labelled. */
export function Tabs({
  tabs,
  label,
  defaultTab,
  className,
}: {
  tabs: TabDef[];
  label: string;
  defaultTab?: string;
  className?: string;
}) {
  const base = useId();
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : e.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="scrollbar-none flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "-mb-px h-11 shrink-0 border-b-2 px-4 text-sm font-medium transition-colors duration-150",
                selected
                  ? "border-brand-600 text-zinc-950 dark:border-brand-500 dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="animate-fade-in pt-6 focus:outline-none"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
