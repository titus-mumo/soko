"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchUsers, type UserPick } from "@/lib/admin.api";
import { Avatar } from "@/components/layout/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Field, controlClasses } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

/**
 * Finds accounts by name, email or phone and picks one (or several, with
 * `multiple`). The admin never needs to know anyone's user ID.
 */
export function UserPicker({
  label,
  value,
  onChange,
  multiple = false,
  error,
}: {
  label: string;
  value: UserPick[];
  onChange: (users: UserPick[]) => void;
  multiple?: boolean;
  error?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserPick[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let stale = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsers(q);
        if (!stale) {
          setResults(found);
          setActive(0);
        }
      } catch {
        if (!stale) setResults([]);
      } finally {
        if (!stale) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q]);

  const chosen = new Set(value.map((u) => u.id));
  const options = results.filter((u) => !chosen.has(u.id));
  const showList = open && q.length >= 2;

  const pick = (user: UserPick) => {
    onChange(multiple ? [...value, user] : [user]);
    setQuery("");
    setResults([]);
    if (multiple) inputRef.current?.focus();
    else setOpen(false);
  };
  const remove = (userId: string) => {
    onChange(value.filter((u) => u.id !== userId));
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (options.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (e.key === "Enter" && showList && options[active]) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && multiple && value.length) {
      remove(value[value.length - 1]!.id);
    }
  };

  // Single mode with someone chosen: show them, with a way to change.
  if (!multiple && value[0]) {
    const user = value[0];
    return (
      <Field id={id} label={label} error={error}>
        <div
          id={id}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/60"
        >
          <Avatar name={user.name} src={user.profilePhoto} size={32} />
          <UserLines user={user} />
          <button
            type="button"
            onClick={() => {
              onChange([]);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="ml-auto shrink-0 rounded-md px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-600/10 dark:text-brand-400"
          >
            Change
          </button>
        </div>
      </Field>
    );
  }

  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={multiple ? "Add as many people as you like." : undefined}
    >
      <div className="relative">
        {multiple && value.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Recipients">
            {value.map((user) => (
              <li
                key={user.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/10 py-1 pl-1 pr-1.5 text-sm text-brand-900 dark:bg-brand-500/15 dark:text-brand-200"
              >
                <Avatar name={user.name} src={user.profilePhoto} size={20} />
                <span className="max-w-[12rem] truncate">{user.name}</span>
                <button
                  type="button"
                  onClick={() => remove(user.id)}
                  className="rounded-full p-0.5 hover:bg-brand-600/20"
                  aria-label={`Remove ${user.name}`}
                >
                  <Icon name="x" size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
            <Icon name="search" size={16} />
          </span>
          <input
            ref={inputRef}
            id={id}
            type="search"
            role="combobox"
            autoComplete="off"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showList && options[active] ? `${listId}-${active}` : undefined
            }
            aria-invalid={error ? true : undefined}
            value={query}
            placeholder="Search by name, email or phone"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className={cn(controlClasses({ error: !!error }), "pl-9")}
          />
        </div>

        {showList && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {options.length > 0 ? (
              <ul
                id={listId}
                role="listbox"
                className="max-h-72 overflow-y-auto py-1"
              >
                {options.map((user, i) => (
                  <li
                    key={user.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    // Pick before the input's blur closes the list.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(user);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2",
                      i === active && "bg-zinc-100 dark:bg-zinc-800",
                    )}
                  >
                    <Avatar
                      name={user.name}
                      src={user.profilePhoto}
                      size={32}
                    />
                    <UserLines user={user} />
                  </li>
                ))}
              </ul>
            ) : (
              <p
                id={listId}
                className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400"
              >
                {searching ? "Searching…" : `No one matches "${q}".`}
              </p>
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

function UserLines({ user }: { user: UserPick }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {user.name}
        </span>
        {user.role === "admin" && (
          <span className="shrink-0 rounded bg-zinc-200 px-1.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
            Admin
          </span>
        )}
      </span>
      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
        {user.email} · {user.phone}
      </span>
    </span>
  );
}
