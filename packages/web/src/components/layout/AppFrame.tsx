"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { ToastContainer } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "soko_sidebar_collapsed";

/** Desktop rail collapse, remembered in localStorage. */
function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  // Skip the width animation for the value restored on load.
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // storage blocked — stay expanded
    }
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {
        // not persisted; still toggles for this page
      }
      return !c;
    });
  }, []);

  return { collapsed, toggle, animate };
}

/** Mobile drawer: slides in from the left; closes on backdrop, ×, Escape or swipe left. */
function MobileDrawer({
  open,
  onClose,
  variant,
}: {
  open: boolean;
  onClose: () => void;
  variant: "app" | "admin";
}) {
  const [dragX, setDragX] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      setDragX(0);
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        !open && "pointer-events-none",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchMove={(e) => {
          if (!start.current) return;
          const dx = e.touches[0].clientX - start.current.x;
          const dy = e.touches[0].clientY - start.current.y;
          if (Math.abs(dx) > Math.abs(dy)) setDragX(Math.min(0, dx));
        }}
        onTouchEnd={() => {
          start.current = null;
          if (dragX < -80) onClose();
          setDragX(0);
        }}
        style={
          dragX
            ? { transform: `translateX(${dragX}px)`, transition: "none" }
            : undefined
        }
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {open && (
          <Sidebar
            variant={variant}
            onNavigate={onClose}
            onClose={onClose}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Sidebar (collapsible desktop rail / mobile drawer) + top bar + mobile tab
 * bar around a centred content column. Used by the account area and admin.
 */
export function AppFrame({
  children,
  variant = "app",
}: {
  children: React.ReactNode;
  variant?: "app" | "admin";
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { collapsed, toggle, animate } = useCollapsed();
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close the drawer when the route changes.
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="flex h-dvh bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop rail */}
      <div className="hidden md:flex">
        <Sidebar
          variant={variant}
          collapsed={collapsed}
          onToggleCollapsed={toggle}
          className={animate ? undefined : "transition-none"}
        />
      </div>

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} variant={variant} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onOpenMenu={() => setDrawerOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          <div
            className={
              variant === "admin"
                ? "mx-auto w-full max-w-content px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
                : pathname === "/"
                  ? // The home page lays out its own full-width sections.
                    "pb-20 md:pb-0"
                  : "mx-auto w-full max-w-content px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-8"
            }
          >
            {children}
          </div>
        </main>
      </div>

      {variant === "app" && <BottomNav />}
      <ToastContainer />
    </div>
  );
}
