"use client";

import { Button } from "./Button";
import { Icon } from "./Icon";

/** Inline failure message with an optional retry — never a blank screen. */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retrying = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 px-6 py-14 text-center dark:border-red-500/20 dark:bg-red-500/5"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <Icon name="alert" size={22} strokeWidth={1.5} />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {message && (
        <p className="mt-1.5 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
      )}
      {onRetry && (
        <Button
          variant="secondary"
          className="mt-6"
          isLoading={retrying}
          onClick={onRetry}
        >
          <Icon name="refresh" size={14} />
          Try again
        </Button>
      )}
    </div>
  );
}
