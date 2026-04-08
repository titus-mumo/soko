"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { toast } from "@/store/toast.store";

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      logout();
      router.replace("/login");
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const roleLabel =
    user?.role === "seller"
      ? "Seller"
      : user?.role === "admin"
        ? "Admin"
        : "Buyer";

  const roleBadgeVariant =
    user?.role === "admin"
      ? "error"
      : user?.role === "seller"
        ? "info"
        : "default";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-4 dark:border-zinc-900 dark:bg-zinc-950">
      <div />
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {initials}
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-tight">
                {user.name ?? user.email ?? user.phone}
              </span>
              <span className="leading-tight">
                <Badge variant={roleBadgeVariant}>{roleLabel}</Badge>
              </span>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-zinc-500 dark:text-zinc-400"
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
