import Link from "next/link";
import { POLICIES_UPDATED, POLICY_LINKS } from "@/lib/legal";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/**
 * A readable policy page: title, last-updated date, a summary, a table of
 * contents, numbered sections and links to the other policies.
 */
export function LegalPage({
  title,
  path,
  summary,
  sections,
}: {
  title: string;
  path: string;
  summary: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <article className="mx-auto max-w-3xl pb-8">
      <JsonLd data={breadcrumbJsonLd([[title, path]])} />
      <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Last updated {POLICIES_UPDATED}
        </p>
        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-brand-400 [&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-zinc-100">
          {summary}
        </div>
      </header>

      <nav
        aria-label="Contents"
        className="border-b border-zinc-200 py-6 dark:border-zinc-800"
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Contents
        </h2>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-zinc-700 hover:text-brand-700 hover:underline dark:text-zinc-300 dark:hover:text-brand-400"
              >
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div
        className={[
          "space-y-10 pt-8 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300",
          "[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
          "[&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
          "[&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-zinc-900 dark:[&_h3]:text-zinc-100",
          "[&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-zinc-100",
          "[&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-brand-400",
          "[&_table]:mt-3 [&_table]:w-full [&_table]:text-sm [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-zinc-900 dark:[&_th]:text-zinc-100",
          "[&_td]:border-t [&_td]:border-zinc-200 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top dark:[&_td]:border-zinc-800",
        ].join(" ")}
      >
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              {i + 1}. {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Our policies
        </h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {POLICY_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={l.href === path ? "page" : undefined}
                className={
                  l.href === path
                    ? "font-medium text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-brand-700 hover:underline dark:text-zinc-400 dark:hover:text-brand-400"
                }
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}
