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

/** Shopping: buyers always, sellers when they switch to "Shopping". */
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

/** Running a store. */
export const SELLING_NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "trend", exact: true },
      { href: "/seller/products", label: "My Listings", icon: "tag" },
      { href: "/seller/orders", label: "Orders", icon: "receipt" },
      NOTIFICATIONS,
      PROFILE,
    ],
  },
  {
    title: "More",
    items: [{ href: "/seller/promotions", label: "Promotions", icon: "zap" }],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Admin",
    items: [
      { href: "/admin", label: "Overview", icon: "home", exact: true },
      { href: "/admin/hub", label: "Hub", icon: "inbox" },
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/orders", label: "Orders", icon: "bag" },
      { href: "/admin/categories", label: "Categories", icon: "grid" },
      { href: "/admin/delivery", label: "Delivery", icon: "truck" },
      { href: "/admin/disputes", label: "Disputes", icon: "shield" },
      { href: "/admin/promotions", label: "Promotions", icon: "tag" },
      { href: "/admin/notifications", label: "Notifications", icon: "bell" },
    ],
  },
];

/** Bottom tab bar (mobile), per mode. */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: "home", exact: true },
  { href: "/products", label: "Products", icon: "package" },
  { href: "/cart", label: "Cart", icon: "cart", badge: "cart" },
  { href: "/orders", label: "Orders", icon: "receipt" },
  PROFILE,
];

export const SELLING_TABS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "trend", exact: true },
  { href: "/seller/products", label: "Listings", icon: "tag" },
  { href: "/seller/orders", label: "Orders", icon: "receipt" },
  { ...NOTIFICATIONS, label: "Alerts" },
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
  ["/profile/seller", "Store settings"],
  ["/profile", "Profile"],
  ["/reviews", "Reviews"],
  ["/disputes", "Disputes"],
  ["/seller/products/new", "New listing"],
  ["/seller/products", "My Listings"],
  ["/seller/orders", "Orders"],
  ["/seller/promotions", "Promotions"],
  ["/admin/users", "Users"],
  ["/admin/hub", "Hub"],
  ["/admin/orders", "Orders"],
  ["/admin/categories", "Categories"],
  ["/admin/delivery", "Delivery zones"],
  ["/admin/disputes", "Disputes"],
  ["/admin/promotions", "Promotions"],
  ["/admin/notifications", "Notifications"],
  ["/admin", "Admin"],
];

export function titleFor(pathname: string): string {
  if (pathname === "/") return "Home";
  if (/^\/seller\/products\/[^/]+\/edit/.test(pathname)) return "Edit listing";
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
