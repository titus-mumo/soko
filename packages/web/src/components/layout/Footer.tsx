import Link from "next/link";

// Only pages that exist — no placeholder links.
const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { href: "/products", label: "All products" },
      { href: "/categories", label: "Categories" },
      { href: "/cart", label: "Cart" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/returns", label: "Returns & refunds" },
      { href: "/cookies", label: "Cookie policy" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/delivery", label: "Delivery zones and fees" },
      { href: "/orders", label: "Track an order" },
      { href: "/disputes", label: "Report a problem" },
      { href: "#tour", label: "Take the tour" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Link
            href="/"
            className="rounded font-display text-xl font-bold tracking-[-0.03em] text-brand-600"
          >
            Soko
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Kenya&apos;s marketplace. Shop with confidence, pay with M-Pesa, get
            it delivered.
          </p>
          <p className="mt-4 text-xs text-zinc-500">© {year} Soko</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-sans text-[12px] font-medium uppercase tracking-wide text-zinc-500">
              {col.title}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="rounded text-sm text-zinc-700 transition-colors hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-500"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-zinc-500 sm:px-6 lg:px-8">
          © {year} Soko. Built in Kenya{" "}
          <span role="img" aria-label="Kenyan flag">
            🇰🇪
          </span>
        </p>
      </div>
    </footer>
  );
}
