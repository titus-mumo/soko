"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function RootError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-center bg-zinc-50 dark:bg-zinc-950"
    >
      <div className="w-full px-4 py-6 sm:px-6">
        <RouteError {...props} />
      </div>
    </main>
  );
}
