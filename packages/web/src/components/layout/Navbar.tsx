"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionUser } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useNotificationStore } from "@/store/notification.store";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";
import { UserMenu, type UserMenuLink } from "./UserMenu";
import { usePopOnIncrease } from "./BottomNav";
import { useSignOut } from "./useSignOut";
import { SearchBox } from "./SearchBox";
import type { User } from "@/store/auth.store";

function accountLinks(user: User): UserMenuLink[] {
  const links: UserMenuLink[] = [
    { href: "/orders", label: "My orders", icon: "bag" },
    { href: "/profile", label: "Profile", icon: "user" },
  ];
  if (user.role === "admin")
    links.push({ href: "/admin", label: "Dashboard", icon: "grid" });
  else if (user.role === "seller")
    links.push({ href: "/dashboard", label: "Dashboard", icon: "grid" });
  return links;
}

const BROWSE: { href: string; label: string; icon: IconName }[] = [
  { href: "/products", label: "All products", icon: "package" },
  { href: "/categories", label: "Categories", icon: "grid" },
  { href: "/delivery", label: "Delivery zones", icon: "truck" },
];

function CountBadge({ count, popKey }: { count: number; popKey?: number }) {
  if (count <= 0) return null;
  return (
    <span
      key={popKey}
      aria-hidden="true"
      className="tabular absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-brand-600 px-1 font-mono text-[10px] font-semibold text-white ring-2 ring-white dark:ring-zinc-950"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function CartLink() {
  const count = useCartStore((s) => s.itemCount);
  const popKey = usePopOnIncrease(count);
  return (
    <Link
      href="/cart"
      className="tap-target relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      <Icon name="cart" size={20} />
      <span className="sr-only">
        Cart{count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ""}
      </span>
      <CountBadge count={count} popKey={popKey} />
    </Link>
  );
}

function BellLink() {
  const unread = useNotificationStore((s) => s.unreadCount);
  return (
    <Link
      href="/notifications"
      className="tap-target relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      <Icon name="bell" size={20} />
      <span className="sr-only">
        Notifications{unread > 0 ? `, ${unread} unread` : ""}
      </span>
      <CountBadge count={unread} />
    </Link>
  );
}

/** Top bar for the home page and every public page. */
export function Navbar() {
  const user = useSessionUser();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close the sheet on navigation.
  useEffect(() => setSheetOpen(false), [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 rounded font-display text-xl font-bold tracking-[-0.03em] text-brand-600"
          >
            Soko
          </Link>

          <SearchBox className="hidden flex-1 md:mx-auto md:block md:max-w-2xl" />

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <span className="hidden md:inline-flex">
              <ThemeToggle />
            </span>
            {user ? (
              <>
                <CartLink />
                <span className="hidden md:inline-flex">
                  <BellLink />
                </span>
                <span className="ml-1 hidden md:inline-flex">
                  <UserMenu user={user} links={accountLinks(user)} />
                </span>
              </>
            ) : (
              <>
                {/* Guests have a browser cart too; it moves to their
                    account when they sign in. */}
                <CartLink />
                <div className="hidden items-center gap-2 md:flex">
                  <ButtonLink href="/login" variant="ghost">
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/register">Start selling</ButtonLink>
                </div>
              </>
            )}
            <IconButton
              label="Open menu"
              onClick={() => setSheetOpen(true)}
              className="md:hidden"
              aria-expanded={sheetOpen}
            >
              <Icon name="menu" size={20} />
            </IconButton>
          </div>
        </div>
      </header>

      {sheetOpen && (
        <MobileSheet user={user} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}

/** Mobile bottom sheet: search, browse links, account or auth buttons. */
function MobileSheet({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { signOut, signingOut } = useSignOut();
  const unread = useNotificationStore((s) => s.unreadCount);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const accountItems: {
    href: string;
    label: string;
    icon: IconName;
    count?: number;
  }[] = user
    ? [
        ...accountLinks(user),
        {
          href: "/notifications",
          label: "Notifications",
          icon: "bell",
          count: unread,
        },
      ]
    : [];

  const row =
    "flex h-12 items-center gap-3 rounded-lg px-3 text-[15px] text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-zinc-950/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-modal-in overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700"
        />
        <div className="flex items-center gap-2">
          <SearchBox className="flex-1" />
          <ThemeToggle />
        </div>

        <nav aria-label="Browse" className="mt-4">
          <p className="px-3 pb-1 text-[12px] font-medium uppercase tracking-wide text-zinc-500">
            Browse
          </p>
          {BROWSE.map((l) => (
            <Link key={l.href} href={l.href} className={row}>
              <Icon name={l.icon} className="text-zinc-400" />
              {l.label}
            </Link>
          ))}
        </nav>

        {user ? (
          <nav
            aria-label="Account"
            className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800"
          >
            <p className="px-3 pb-1 text-[12px] font-medium uppercase tracking-wide text-zinc-500">
              {user.name ?? "Account"}
            </p>
            {accountItems.map((l) => (
              <Link key={l.href} href={l.href} className={row}>
                <Icon name={l.icon} className="text-zinc-400" />
                <span className="flex-1">{l.label}</span>
                {l.count ? (
                  <span className="tabular rounded-full bg-brand-600 px-2 font-mono text-xs font-semibold text-white">
                    {l.count}
                  </span>
                ) : null}
              </Link>
            ))}
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className={cn(row, "w-full disabled:opacity-50")}
            >
              <Icon name="logout" className="text-zinc-400" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </nav>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <ButtonLink href="/login" variant="secondary" size="lg">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register" size="lg">
              Start selling
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}
