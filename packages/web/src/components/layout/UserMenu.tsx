"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "./Avatar";
import { useSignOut } from "./useSignOut";
import type { User } from "@/store/auth.store";

export interface UserMenuLink {
  href: string;
  label: string;
  icon: IconName;
}

/** Avatar button opening a small account menu. */
export function UserMenu({
  user,
  links: customLinks,
}: {
  user: User;
  /** Replaces the default role-based links. */
  links?: UserMenuLink[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { signOut, signingOut } = useSignOut();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isAdmin = user.role === "admin";
  const isSeller = user.role === "seller" || isAdmin;
  const links: UserMenuLink[] =
    customLinks ??
    (isAdmin
      ? [{ href: "/admin", label: "Admin overview", icon: "home" }]
      : [
          { href: "/profile", label: "Profile", icon: "user" },
          { href: "/orders", label: "Orders", icon: "bag" },
          isSeller
            ? {
                href: "/profile/seller",
                label: "Store settings",
                icon: "store",
              }
            : {
                href: "/profile/seller",
                label: "Start selling",
                icon: "store",
              },
        ]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="tap-target flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-90"
      >
        <Avatar name={user.name} size={32} />
        <span className="sr-only">
          Account menu for {user.name ?? user.email}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right animate-modal-in overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight dark:shadow-black/50"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {user.name}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {user.email ?? user.phone}
            </p>
          </div>
          <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          {links.map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Icon name={l.icon} size={16} className="text-zinc-500" />
              {l.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
            )}
          >
            <Icon name="logout" size={16} className="text-zinc-500" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
