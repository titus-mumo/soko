import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Which live count to show beside the label. */
  badge?: "cart" | "unread";
  /** Match the path exactly rather than as a prefix. */
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const SHOP_NAV: NavItem[] = [
  { href: "/products", label: "Products", icon: "package" },
  { href: "/categories", label: "Categories", icon: "grid" },
];

const NOTIFICATIONS: NavItem = {
  href: "/notifications",
  label: "Notifications",
  icon: "bell",
  badge: "unread",
};
const PROFILE: NavItem = { href: "/profile", label: "Profile", icon: "user" };

/** The signed-in shopper's navigation. */
export const BUYING_NAV: NavSection[] = [
  {
    items: [
      { href: "/", label: "Home", icon: "home", exact: true },
      { href: "/products", label: "Products", icon: "package" },
      { href: "/cart", label: "Cart", icon: "cart", badge: "cart" },
      { href: "/orders", label: "Orders", icon: "receipt" },
      NOTIFICATIONS,
      PROFILE,
    ],
  },
  {
    title: "More",
    items: [
      { href: "/reviews", label: "Reviews", icon: "star" },
      { href: "/disputes", label: "Disputes", icon: "shield" },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Admin",
    items: [
      { href: "/admin", label: "Overview", icon: "home", exact: true },
      { href: "/admin/products", label: "Products", icon: "tag" },
      { href: "/admin/hub", label: "Hub", icon: "inbox" },
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/orders", label: "Orders", icon: "bag" },
      { href: "/admin/categories", label: "Categories", icon: "grid" },
      { href: "/admin/delivery", label: "Delivery", icon: "truck" },
      { href: "/admin/disputes", label: "Disputes", icon: "shield" },
      { href: "/admin/promotions", label: "Promotions", icon: "tag" },
      { href: "/admin/notifications", label: "Notifications", icon: "bell" },
      { href: "/admin/monitoring", label: "Monitoring", icon: "trend" },
      { href: "/admin/audit", label: "Audit log", icon: "receipt" },
    ],
  },
];

/** Bottom tab bar (mobile). */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: "home", exact: true },
  { href: "/products", label: "Products", icon: "package" },
  { href: "/cart", label: "Cart", icon: "cart", badge: "cart" },
  { href: "/orders", label: "Orders", icon: "receipt" },
  PROFILE,
];

export const GUEST_TABS: NavItem[] = [
  { href: "/products", label: "Products", icon: "package" },
  { href: "/categories", label: "Categories", icon: "grid" },
  { href: "/login", label: "Sign in", icon: "user" },
];

/** Top-bar title for the current route. Longest matching prefix wins. */
const TITLES: [prefix: string, title: string][] = [
  ["/dashboard", "Dashboard"],
  ["/products", "Products"],
  ["/categories", "Categories"],
  ["/delivery", "Delivery zones"],
  ["/cart", "Cart"],
  ["/checkout/pending", "Payment"],
  ["/checkout", "Checkout"],
  ["/orders", "Orders"],
  ["/notifications", "Notifications"],
  ["/profile/password", "Password"],
  ["/profile/addresses", "Addresses"],
  ["/profile", "Profile"],
  ["/reviews", "Reviews"],
  ["/disputes", "Disputes"],
  ["/admin/products/new", "New listing"],
  ["/admin/products", "Products"],
  ["/admin/users", "Users"],
  ["/admin/hub", "Hub"],
  ["/admin/orders", "Orders"],
  ["/admin/categories", "Categories"],
  ["/admin/delivery", "Delivery zones"],
  ["/admin/disputes", "Disputes"],
  ["/admin/promotions", "Promotions"],
  ["/admin/notifications", "Notifications"],
  ["/admin/audit", "Audit log"],
  ["/admin/monitoring", "Monitoring"],
  ["/admin", "Admin"],
];

export function titleFor(pathname: string): string {
  if (pathname === "/") return "Home";
  if (/^\/admin\/products\/[^/]+\/edit/.test(pathname)) return "Edit listing";
  const match = TITLES.filter(
    ([p]) => pathname === p || pathname.startsWith(`${p}/`),
  ).sort((a, b) => b[0].length - a[0].length)[0];
  return match?.[1] ?? "Soko";
}

export function isActive(item: NavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
