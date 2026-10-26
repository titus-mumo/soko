"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useMode, useSessionUser } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useNotificationStore } from "@/store/notification.store";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import { Wordmark } from "./Wordmark";
import { titleFor } from "./nav";
import { SearchBox } from "./SearchBox";

export function TopBar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const pathname = usePathname();
  const user = useSessionUser();
  const unread = useNotificationStore((s) => s.unreadCount);
  const cartCount = useCartStore((s) => s.itemCount);
  const mode = useMode();
  const isAdmin = pathname.startsWith("/admin");
  const home = isAdmin ? "/admin" : mode === "selling" ? "/dashboard" : "/";
  const [mobileSearch, setMobileSearch] = useState(false);

  // Close the phone search row after navigating (e.g. submitting a search).
  useEffect(() => setMobileSearch(false), [pathname]);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {onOpenMenu && (
            <IconButton
              label="Open menu"
              onClick={onOpenMenu}
              className="-ml-2 md:hidden"
            >
              <Icon name="menu" size={20} />
            </IconButton>
          )}
          {/* Brand on mobile; the sidebar shows it on desktop. */}
          <span className="md:hidden">
            <Wordmark href={home} />
          </span>
          <p className="hidden truncate font-display text-base font-semibold text-zinc-900 dark:text-zinc-50 md:block">
            {titleFor(pathname)}
          </p>
        </div>

        {!isAdmin && <SearchBox className="hidden max-w-xl flex-1 md:block" />}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {!isAdmin && (
            <IconButton
              label={mobileSearch ? "Close search" : "Search"}
              onClick={() => setMobileSearch((o) => !o)}
              aria-expanded={mobileSearch}
              className="md:hidden"
            >
              <Icon name={mobileSearch ? "x" : "search"} size={18} />
            </IconButton>
          )}
          <ThemeToggle />

          {user ? (
            <>
              {!isAdmin && (
                <Link
                  href="/notifications"
                  className="tap-target relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <Icon
                    name="bell"
                    size={18}
                    className={cn(
                      unread > 0 &&
                        "origin-top animate-ring [animation-iteration-count:1]",
                    )}
                  />
                  <span className="sr-only">
                    Notifications{unread > 0 ? `, ${unread} unread` : ""}
                  </span>
                  {unread > 0 && (
                    <span
                      aria-hidden="true"
                      className="tabular absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 font-mono text-[9px] font-semibold text-white ring-2 ring-zinc-50 dark:ring-zinc-950"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              )}
              {!isAdmin && mode === "buying" && (
                <Link
                  href="/cart"
                  className="tap-target relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <Icon name="cart" size={18} />
                  <span className="sr-only">
                    Cart{cartCount > 0 ? `, ${cartCount} items` : ""}
                  </span>
                  {cartCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="tabular absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 font-mono text-[9px] font-semibold text-white ring-2 ring-zinc-50 dark:ring-zinc-950"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
              )}
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <ButtonLink
                href="/register"
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Create account
              </ButtonLink>
              <ButtonLink href="/login" size="sm">
                Sign in
              </ButtonLink>
            </>
          )}
        </div>
      </div>
      {mobileSearch && !isAdmin && (
        <div className="animate-fade-in border-t border-zinc-200 px-4 py-2.5 md:hidden dark:border-zinc-800">
          <SearchBox autoFocus />
        </div>
      )}
    </header>
  );
}
