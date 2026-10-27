"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart.store";
import { useSessionUser } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { Icon } from "@/components/ui/Icon";
import { GUEST_TABS, MOBILE_TABS, isActive } from "./nav";

/** A key that changes whenever `value` increases — remount to replay a CSS animation. */
export function usePopOnIncrease(value: number) {
  const prev = useRef(value);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (value > prev.current) setKey((k) => k + 1);
    prev.current = value;
  }, [value]);
  return key;
}

/** Mobile tab bar — replaces the sidebar below md. */
export function BottomNav() {
  const pathname = usePathname();
  const user = useSessionUser();
  const itemCount = useCartStore((s) => s.itemCount);
  const popKey = usePopOnIncrease(itemCount);
  const unread = useNotificationStore((s) => s.unreadCount);
  const tabs = user ? MOBILE_TABS : GUEST_TABS;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden"
    >
      <div className="flex h-16 items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab, pathname);
          const n =
            tab.badge === "cart"
              ? itemCount
              : tab.badge === "unread"
                ? unread
                : 0;
          const badge = n > 0 ? n : null;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors duration-150",
                active
                  ? "text-brand-600 dark:text-brand-500"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-0.5 w-8 rounded-b-full bg-brand-600 dark:bg-brand-500"
                />
              )}
              <span className="relative">
                <Icon
                  name={tab.icon}
                  size={22}
                  strokeWidth={active ? 2 : 1.75}
                />
                {badge !== null && (
                  <span
                    key={popKey}
                    aria-hidden="true"
                    className="tabular absolute -right-2.5 -top-1.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-brand-600 px-1 font-mono text-[9px] font-semibold text-white ring-2 ring-white dark:ring-zinc-950"
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span>
                {tab.label}
                {badge !== null && (
                  <span className="sr-only">
                    , {badge}{" "}
                    {tab.badge === "cart" ? "items in cart" : "unread"}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
