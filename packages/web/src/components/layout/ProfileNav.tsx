"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { Icon, type IconName } from "@/components/ui/Icon";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/profile/addresses", label: "Addresses", icon: "pin" },
  { href: "/profile/password", label: "Password", icon: "key" },
  { href: "/profile/seller", label: "Store", icon: "store" },
];

/** Tabs shared by the /profile/* pages. */
export function ProfileNav() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);

  return (
    <nav
      aria-label="Account sections"
      className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-zinc-200 px-4 dark:border-zinc-800 sm:mx-0 sm:px-0"
    >
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors duration-150",
              active
                ? "border-brand-600 text-zinc-950 dark:border-brand-500 dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            <Icon name={l.icon} size={16} />
            {l.href === "/profile/seller" && role === "buyer"
              ? "Start selling"
              : l.label}
          </Link>
        );
      })}
    </nav>
  );
}
