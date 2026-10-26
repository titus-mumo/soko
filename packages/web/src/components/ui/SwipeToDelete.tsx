"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const ACTION_WIDTH = 88;

/**
 * Touch-only swipe-left to reveal a delete action. Mouse and keyboard users
 * get the row's regular remove button instead, so nothing depends on it.
 */
export function SwipeToDelete({
  onDelete,
  label,
  disabled,
  children,
  className,
}: {
  onDelete: () => void;
  /** Accessible name for the revealed button, e.g. "Remove Kikoy towel". */
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const horizontal = useRef<boolean | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || disabled) return;
    start.current = { x: e.clientX, y: e.clientY, base: offset };
    horizontal.current = null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    // Decide once per gesture whether this is a swipe or a scroll.
    if (horizontal.current === null && Math.hypot(dx, dy) > 8) {
      horizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!horizontal.current) return;
    setDragging(true);
    setOffset(Math.min(0, Math.max(-ACTION_WIDTH * 1.4, s.base + dx)));
  };

  const onPointerEnd = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    setOffset((o) => (o < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0));
  };

  const open = offset <= -ACTION_WIDTH / 2;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => {
          setOffset(0);
          onDelete();
        }}
        // Only reachable once revealed; the row has its own remove button.
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className="absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 bg-red-600 text-sm font-medium text-white"
        style={{ width: ACTION_WIDTH }}
      >
        <Icon name="trash" />
        <span className="sr-only">{label}</span>
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={cn(
          "relative touch-pan-y bg-white dark:bg-zinc-900",
          !dragging && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
