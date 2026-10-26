/** Shown while a shell restores the session — branded, never a blank page. */
export function FullPageLoader({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-zinc-50 dark:bg-zinc-950"
      role="status"
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-900/30"
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="white"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 10h16l-1.6 8.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z" />
          <path d="M8 10 12 4l4 6" />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className="relative h-0.5 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <span className="absolute inset-y-0 w-1/2 animate-shimmer rounded-full bg-brand-600" />
      </span>
    </div>
  );
}
