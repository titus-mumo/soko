import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { fetchMarketStats } from "@/lib/server-api";

// Social proof is real data; refresh it every few minutes.
export const revalidate = 300;

const fmt = (n: number) => n.toLocaleString("en-KE");

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stats = await fetchMarketStats();
  const statItems = stats
    ? [
        {
          value: stats.products,
          label: stats.products === 1 ? "product" : "products",
        },
        {
          value: stats.counties,
          label: stats.counties === 1 ? "county covered" : "counties covered",
        },
      ]
    : [];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Branding — desktop only */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-emerald-900 to-zinc-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Soft light from the top-left; quiet, but gives the panel depth. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"
        />
        <Wordmark inverted className="relative" />

        <div className="relative max-w-md">
          <h2 className="text-5xl font-bold text-white">
            Kenya&apos;s marketplace, built for you.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-brand-100/80">
            Shop electronics, fashion and home goods, pay with M-Pesa, and get
            it delivered across the country.
          </p>
        </div>

        {statItems.length > 0 ? (
          <dl className="relative grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {statItems.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="tabular block font-mono text-3xl font-semibold text-white">
                    {fmt(s.value)}
                  </span>
                  <span className="mt-1 block text-sm text-brand-100/70">
                    {s.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <span />
        )}
      </aside>

      {/* Form */}
      <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
        <header className="flex h-16 items-center justify-between px-6 sm:px-10">
          <span className="lg:invisible">
            <Wordmark />
          </span>
          <ThemeToggle />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 focus:outline-none sm:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
