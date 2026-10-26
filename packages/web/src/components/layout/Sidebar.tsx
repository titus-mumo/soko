"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notification.store";
import { useCartStore } from "@/store/cart.store";
import {
  canSell,
  useAuthStore,
  useMode,
  useSessionUser,
  type Mode,
} from "@/store/auth.store";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { Avatar } from "./Avatar";
import { Wordmark } from "./Wordmark";
import { useSignOut } from "./useSignOut";
import {
  ADMIN_NAV,
  BUYING_NAV,
  SELLING_NAV,
  isActive,
  type NavItem,
  type NavSection,
} from "./nav";

const ROLE_TONE = {
  admin: "error",
  seller: "brand",
  buyer: "neutral",
} as const;

function CountPill({
  count,
  active,
  label,
}: {
  count: number;
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "tabular flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 font-mono text-2xs font-semibold",
        active
          ? "bg-brand-600 text-white"
          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

function NavLink({
  item,
  count,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  count?: number;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(item, pathname);
  const hasCount = count !== undefined && count > 0;
  const countLabel = item.badge === "cart" ? "items in cart" : "unread";

  return (
    <Tooltip
      label={item.label}
      side="right"
      disabled={!collapsed}
      className="flex w-full"
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={
          collapsed
            ? item.label + (hasCount ? `, ${count} ${countLabel}` : "")
            : undefined
        }
        className={cn(
          "relative flex h-10 items-center rounded-lg border-l-2 text-sm font-medium transition-colors duration-150",
          collapsed ? "mx-auto w-10 justify-center" : "w-full gap-3 px-3",
          active
            ? "border-brand-600 bg-brand-600/10 text-brand-600 dark:text-brand-500"
            : "border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100",
        )}
      >
        <Icon name={item.icon} size={20} strokeWidth={1.5} />
        {collapsed ? (
          hasCount && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white dark:ring-zinc-900"
            />
          )
        ) : (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {hasCount && (
              <CountPill count={count} active={active} label={countLabel} />
            )}
          </>
        )}
      </Link>
    </Tooltip>
  );
}

const MODES: { mode: Mode; label: string; icon: IconName; home: string }[] = [
  { mode: "buying", label: "Shopping", icon: "bag", home: "/" },
  { mode: "selling", label: "Selling", icon: "store", home: "/dashboard" },
];

/** Shopping / Selling toggle for sellers. */
function ModeSwitcher({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const mode = useMode();
  const setMode = useAuthStore((s) => s.setMode);
  const router = useRouter();

  const choose = (next: (typeof MODES)[number]) => {
    if (next.mode === mode) return;
    setMode(next.mode);
    onNavigate?.();
    router.push(next.home);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Mode"
      className={cn(
        "rounded-full bg-zinc-100 p-1 dark:bg-zinc-800/80",
        collapsed
          ? "mx-auto flex w-10 flex-col gap-1"
          : "grid grid-cols-2 gap-1",
      )}
    >
      {MODES.map((m) => {
        const active = m.mode === mode;
        return (
          <Tooltip
            key={m.mode}
            label={m.label}
            side="right"
            disabled={!collapsed}
            className="flex"
          >
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={collapsed ? `${m.label} mode` : undefined}
              onClick={() => choose(m)}
              className={cn(
                "flex h-8 w-full items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors duration-150",
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100",
              )}
            >
              <Icon
                name={m.icon}
                size={collapsed ? 16 : 14}
                strokeWidth={1.75}
              />
              {!collapsed && m.label}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/**
 * Sidebar contents — the desktop rail (expandable/collapsible) and the
 * mobile drawer. Navigation follows the current mode.
 */
export function Sidebar({
  variant = "app",
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  onClose,
  className,
}: {
  variant?: "app" | "admin";
  /** Desktop icon-only rail. */
  collapsed?: boolean;
  /** Shows the edge toggle when provided (desktop). */
  onToggleCollapsed?: () => void;
  /** Called after a link is followed (closes the mobile drawer). */
  onNavigate?: () => void;
  /** Shown as a close button when rendered in the drawer. */
  onClose?: () => void;
  className?: string;
}) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const itemCount = useCartStore((s) => s.itemCount);
  const user = useSessionUser();
  const mode = useMode();
  const { signOut, signingOut } = useSignOut();

  const sections: NavSection[] =
    variant === "admin"
      ? ADMIN_NAV
      : mode === "selling"
        ? SELLING_NAV
        : BUYING_NAV;

  const countFor = (item: NavItem) =>
    item.badge === "cart"
      ? itemCount
      : item.badge === "unread"
        ? unreadCount
        : undefined;

  const role = (user?.role ?? "buyer") as keyof typeof ROLE_TONE;
  const home =
    variant === "admin" ? "/admin" : mode === "selling" ? "/dashboard" : "/";

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-900",
        collapsed ? "w-16" : "w-60",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center",
          collapsed ? "justify-center" : "justify-between px-5",
        )}
      >
        {collapsed ? (
          <Link
            href={home}
            aria-label="Soko home"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-display text-sm font-bold text-white"
          >
            S
          </Link>
        ) : (
          <Wordmark href={home} />
        )}
        {onClose && (
          <IconButton
            label="Close menu"
            size="sm"
            onClick={onClose}
            className="-mr-2"
          >
            <Icon name="x" size={18} />
          </IconButton>
        )}
      </div>

      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm transition-colors hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <Icon
            name={collapsed ? "chevron-right" : "chevron-left"}
            size={14}
            strokeWidth={2}
          />
        </button>
      )}

      <nav
        aria-label="Main"
        className={cn(
          "flex-1 pb-4 pt-2",
          collapsed ? "overflow-visible px-3" : "overflow-y-auto px-3",
        )}
      >
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && "mt-6")}>
            {section.title &&
              (collapsed ? (
                <div
                  aria-hidden="true"
                  className="mx-auto mb-2 h-px w-6 bg-zinc-200 dark:bg-zinc-800"
                />
              ) : (
                <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {section.title}
                </p>
              ))}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  count={countFor(item)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {variant === "app" && canSell(user) && (
        <div className="px-3 pb-3">
          <ModeSwitcher collapsed={collapsed} onNavigate={onNavigate} />
        </div>
      )}

      {user && (
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip label={user.name ?? "Account"} side="right">
                <Link
                  href="/profile"
                  aria-label="Your profile"
                  className="rounded-full"
                >
                  <Avatar name={user.name} size={36} />
                </Link>
              </Tooltip>
              <Tooltip label="Sign out" side="right">
                <IconButton
                  label="Sign out"
                  size="sm"
                  onClick={signOut}
                  isLoading={signingOut}
                >
                  <Icon name="logout" size={16} />
                </IconButton>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg p-2">
              <Avatar name={user.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {user.name ?? user.email ?? user.phone}
                </p>
                <Badge
                  tone={ROLE_TONE[role] ?? "neutral"}
                  size="sm"
                  className="mt-0.5 capitalize"
                >
                  {role}
                </Badge>
              </div>
              <Tooltip label="Sign out" side="top">
                <IconButton
                  label="Sign out"
                  size="sm"
                  onClick={signOut}
                  isLoading={signingOut}
                >
                  <Icon name="logout" size={16} />
                </IconButton>
              </Tooltip>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
