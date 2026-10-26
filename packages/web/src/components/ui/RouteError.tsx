"use client";

import Link from "next/link";
import { Button } from "./Button";
import { Icon } from "./Icon";

const GENERIC = "We couldn't load this. Check your connection and try again.";

// Looks like an internal/runtime error rather than something written for people.
const TECHNICAL =
  /undefined|null|NaN|is not a function|is not defined|cannot read|unexpected token|TypeError|ReferenceError|SyntaxError|NEXT_|ECONN|fetch failed|\bat\s+\S+\s*\(/i;

/**
 * Message to show for an error. Server errors arrive with a digest and a
 * scrubbed message in production; client errors can be raw runtime text.
 * Only short, human-readable messages are passed through.
 */
function safeMessage(error: Error & { digest?: string }): string {
  const msg = error.message?.trim();
  if (error.digest || !msg || msg.length > 160 || TECHNICAL.test(msg))
    return GENERIC;
  return msg;
}

/** Shared body for every route's error.tsx boundary. Sits inside the page's layout. */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center"
    >
      <Icon
        name="triangle-alert"
        size={40}
        strokeWidth={1.5}
        className="text-zinc-400"
      />
      <h1 className="mt-5 text-lg font-semibold text-zinc-950 dark:text-zinc-100">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {safeMessage(error)}
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-zinc-400">
          Ref {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <Icon name="refresh" size={14} />
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
