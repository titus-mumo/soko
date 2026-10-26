import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The app frame's shape — sidebar, top bar, content — shown while a shell
 * restores the session, so the layout never jumps or flashes a redirect.
 */
export function AppShellSkeleton({ label }: { label: string }) {
  return (
    <div
      className="flex h-dvh bg-zinc-50 dark:bg-zinc-950"
      role="status"
      aria-label={label}
    >
      <div className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-14 items-center px-5">
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
        <div className="flex-1 space-y-1.5 px-3 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex h-10 items-center gap-3 px-3">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 sm:px-6 dark:border-zinc-800">
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-content space-y-6 px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
