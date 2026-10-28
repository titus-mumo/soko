"use client";

import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { getSuggestions, type Suggestions } from "@/lib/search.api";
import { getRootCategories } from "@/lib/categories.api";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/lib/recent-searches";
import { cn, formatKES } from "@/lib/utils";
import type { Category } from "@/lib/types";

const DEBOUNCE_MS = 150;

interface Option {
  id: string;
  /** Where choosing it goes. Search options also record the query. */
  href: string;
  search?: string;
  label: string;
  icon: IconName;
  image?: string | null;
  price?: string | null;
}

interface Group {
  title: string;
  options: Option[];
  onClear?: () => void;
}

const searchHref = (q: string) => "/products?q=" + encodeURIComponent(q);

// Root categories rarely change; fetch once per page load.
let rootCategories: Promise<Category[]> | null = null;
function loadRootCategories() {
  rootCategories ??= getRootCategories().catch(() => {
    rootCategories = null;
    return [];
  });
  return rootCategories;
}

/** Bolds the part of `text` that matches `query`. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-zinc-950 dark:text-white">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}

/**
 * Search with suggestions. Focused and empty: recent searches and
 * categories. Typing: matching products, categories and stores, plus a
 * "Search for …" row. Arrow keys move, Enter picks, Escape closes.
 */
function SearchCombobox({
  className,
  autoFocus,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const id = useId();
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);

  // Mirror the current search when on the results page.
  useEffect(() => {
    setQuery(pathname === "/products" ? (params.get("q") ?? "") : "");
    setOpen(false);
  }, [pathname, params]);

  // Live suggestions, debounced; stale requests are aborted.
  const term = query.trim();
  useEffect(() => {
    if (!open || !term) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      getSuggestions(term, ctrl.signal)
        .then((r) => setResults(r))
        .catch(() => {
          if (!ctrl.signal.aborted) setResults(null);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openPanel = () => {
    setRecent(getRecentSearches());
    loadRootCategories().then(setCategories);
    setOpen(true);
  };

  const groups: Group[] = useMemo(() => {
    if (!term) {
      const g: Group[] = [];
      if (recent.length)
        g.push({
          title: "Recent searches",
          options: recent.map((r, i) => ({
            id: `${id}-recent-${i}`,
            href: searchHref(r),
            search: r,
            label: r,
            icon: "clock",
          })),
          onClear: () => {
            clearRecentSearches();
            setRecent([]);
          },
        });
      if (categories.length)
        g.push({
          title: "Browse categories",
          options: categories.slice(0, 6).map((c) => ({
            id: `${id}-root-${c.id}`,
            href: `/categories/${c.slug}`,
            label: c.name,
            icon: "grid",
          })),
        });
      return g;
    }

    const g: Group[] = [
      {
        title: "",
        options: [
          {
            id: `${id}-search`,
            href: searchHref(term),
            search: term,
            label: `Search for “${term}”`,
            icon: "search",
          },
        ],
      },
    ];
    if (results?.products.length)
      g.push({
        title: "Products",
        options: results.products.map((p) => ({
          id: `${id}-p-${p.slug}`,
          href: `/products/${p.slug}`,
          label: p.name,
          icon: "package",
          image: p.image,
          price: p.price,
        })),
      });
    if (results?.categories.length)
      g.push({
        title: "Categories",
        options: results.categories.map((c) => ({
          id: `${id}-c-${c.slug}`,
          href: `/categories/${c.slug}`,
          label: c.name,
          icon: "grid",
        })),
      });
    return g;
  }, [term, recent, categories, results, id]);

  const options = groups.flatMap((g) => g.options);
  const showPanel = open && options.length > 0;

  // Reset the highlight whenever the list changes.
  useEffect(() => setActive(-1), [term, results]);

  const choose = (o: Option) => {
    if (o.search) addRecentSearch(o.search);
    setOpen(false);
    inputRef.current?.blur();
    router.push(o.href);
  };

  const submit = () => {
    if (active >= 0 && options[active]) return choose(options[active]);
    if (term) addRecentSearch(term);
    setOpen(false);
    inputRef.current?.blur();
    router.push(searchHref(term));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openPanel();
      setActive((a) => (options.length ? (a + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) =>
        options.length ? (a <= 0 ? options.length - 1 : a - 1) : -1,
      );
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  };

  let index = -1;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={id} className="sr-only">
          Search Soko
        </label>
        <Icon
          name="search"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? options[active]?.id : undefined}
          autoComplete="off"
          value={query}
          autoFocus={autoFocus}
          onFocus={openPanel}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) openPanel();
          }}
          onKeyDown={onKeyDown}
          placeholder="Search products and categories..."
          className="h-10 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-600 focus:outline-none focus:ring-[3px] focus:ring-brand-600/25 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && (
          <span
            aria-hidden="true"
            className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-300 border-t-brand-600 dark:border-zinc-700"
          />
        )}
      </form>

      <div
        id={listId}
        role="listbox"
        aria-label="Search suggestions"
        hidden={!showPanel}
        className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(70vh,28rem)] animate-fade-in overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/50"
      >
        {groups.map((g, gi) => (
          <div
            key={g.title || gi}
            role="group"
            aria-label={g.title || "Search"}
            className={cn(
              gi > 0 &&
                "mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800",
            )}
          >
            {g.title && (
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <span className="text-2xs font-medium uppercase tracking-widest text-zinc-500">
                  {g.title}
                </span>
                {g.onClear && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={g.onClear}
                    className="rounded text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {g.options.map((o) => {
              index += 1;
              const i = index;
              const selected = i === active;
              return (
                <div
                  key={o.id}
                  id={o.id}
                  role="option"
                  aria-selected={selected}
                  // Keep focus in the input while clicking.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300",
                    selected && "bg-zinc-100 dark:bg-zinc-800",
                  )}
                >
                  {o.image !== undefined ? (
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-inset ring-zinc-900/5 dark:ring-white/10">
                      {o.image ? (
                        <SafeImage
                          src={o.image}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-contain p-[6%]"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-zinc-400">
                          <Icon name="package" size={14} />
                        </span>
                      )}
                    </span>
                  ) : (
                    <Icon
                      name={o.icon}
                      size={16}
                      className="shrink-0 text-zinc-400"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {o.search && o.icon === "search" ? (
                      o.label
                    ) : (
                      <Highlight text={o.label} query={term} />
                    )}
                  </span>
                  {o.price && (
                    <span className="tabular shrink-0 font-mono text-xs font-medium text-brand-600 dark:text-brand-500">
                      {formatKES(o.price)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Result count for screen readers. */}
      <span className="sr-only" aria-live="polite">
        {term && results && !loading
          ? `${results.products.length + results.categories.length} suggestions`
          : ""}
      </span>
    </div>
  );
}

/** useSearchParams needs a Suspense boundary; the fallback keeps the size. */
export function SearchBox(props: { className?: string; autoFocus?: boolean }) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className={cn(
            "h-10 rounded-full border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
            props.className,
          )}
        />
      }
    >
      <SearchCombobox {...props} />
    </Suspense>
  );
}
