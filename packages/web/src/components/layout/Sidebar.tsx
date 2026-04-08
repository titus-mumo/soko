"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notification.store";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  sellerOnly?: boolean;
}

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  );
}

function ShoppingBagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" x2="21" y1="6" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </svg>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200",
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded bg-blue-600 px-1 text-[10px] font-medium text-white">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const itemCount = useCartStore((s) => s.itemCount);
  const user = useAuthStore((s) => s.user);
  const isSeller = user?.role === "seller" || user?.role === "admin";

  const buyerNav: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: <HomeIcon /> },
    { href: "/products", label: "Products", icon: <PackageIcon /> },
    { href: "/orders", label: "Orders", icon: <ShoppingBagIcon /> },
    { href: "/cart", label: "Cart", icon: <CartIcon />, badge: itemCount },
    {
      href: "/notifications",
      label: "Notifications",
      icon: <BellIcon />,
      badge: unreadCount,
    },
  ];

  const sellerNav: NavItem[] = [
    {
      href: "/seller/products",
      label: "My Listings",
      icon: <StoreIcon />,
      sellerOnly: true,
    },
    {
      href: "/seller/orders",
      label: "Seller Orders",
      icon: <ShoppingBagIcon />,
      sellerOnly: true,
    },
  ];

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-100 bg-white dark:border-zinc-900 dark:bg-zinc-950">
      <div className="px-4 py-5">
        <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Soko
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
        {buyerNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {isSeller && (
          <>
            <div className="my-2 border-t border-zinc-100 dark:border-zinc-900" />
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
              Seller
            </p>
            {sellerNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
