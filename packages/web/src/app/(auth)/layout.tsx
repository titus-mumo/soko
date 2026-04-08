import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Soko
        </span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>
  );
}
