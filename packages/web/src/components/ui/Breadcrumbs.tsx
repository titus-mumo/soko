import Link from "next/link";
import { Icon } from "./Icon";

/** Visible trail matching the BreadcrumbList structured data. */
export function Breadcrumbs({
  items,
}: {
  /** [label, href]; the last item is the current page and isn't linked. */
  items: [label: string, href: string][];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        {items.map(([label, href], i) => {
          const last = i === items.length - 1;
          return (
            <li key={href} className="flex items-center gap-1.5">
              {last ? (
                <span
                  aria-current="page"
                  className="max-w-[16rem] truncate font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {label}
                </span>
              ) : (
                <>
                  <Link
                    href={href}
                    className="rounded transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {label}
                  </Link>
                  <Icon
                    name="chevron-right"
                    size={14}
                    className="text-zinc-400 dark:text-zinc-600"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
