"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

function Icon({ d }: { d: string | string[] }) {
  const paths = Array.isArray(d) ? d : [d];
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
      {paths.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

const adminNav: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    exact: true,
    icon: <Icon d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: (
      <Icon
        d={[
          "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
          "M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
          "M22 21v-2a4 4 0 0 0-3-3.87",
          "M16 3.13a4 4 0 0 1 0 7.75",
        ]}
      />
    ),
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: (
      <Icon
        d={[
          "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z",
          "M3 6h18",
          "M16 10a4 4 0 0 1-8 0",
        ]}
      />
    ),
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: (
      <Icon
        d={[
          "M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.29-3.29c.94-.94.94-2.48 0-3.42L9 5z",
          "M6 9.01V9",
        ]}
      />
    ),
  },
  {
    href: "/admin/delivery",
    label: "Delivery",
    icon: (
      <Icon
        d={[
          "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3",
          "M9 17h6l4-4v-3h-9v3H9",
          "M17 17v4",
          "M15 21h4",
        ]}
      />
    ),
  },
  {
    href: "/admin/disputes",
    label: "Disputes",
    icon: <Icon d={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]} />,
  },
  {
    href: "/admin/promotions",
    label: "Promotions",
    icon: (
      <Icon
        d={[
          "M9 14 4 9l5-5",
          "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11",
        ]}
      />
    ),
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: (
      <Icon
        d={[
          "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9",
          "M13.73 21a2 2 0 0 1-3.46 0",
        ]}
      />
    ),
  },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
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
    </Link>
  );
}

export function AdminSidebar() {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-100 bg-white dark:border-zinc-900 dark:bg-zinc-950">
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Soko
        </span>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          Admin
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
        {adminNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
