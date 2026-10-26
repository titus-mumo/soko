import { cn } from "@/lib/utils";

type CardVariant = "base" | "hover" | "interactive";

/** Surface classes, for elements that can't use <Card> (links, list items). */
export function cardClasses({
  variant = "base",
  padded = true,
  className,
}: { variant?: CardVariant; padded?: boolean; className?: string } = {}) {
  return cn(
    "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight",
    padded && "p-5",
    variant !== "base" &&
      "transition-[border-color,transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:border-zinc-300 hover:shadow-sm dark:hover:border-zinc-700 dark:hover:shadow-highlight",
    variant === "interactive" && "cursor-pointer",
    className,
  );
}

export function Card({
  variant = "base",
  padded = true,
  as: Tag = "div",
  className,
  children,
  ...props
}: {
  variant?: CardVariant;
  padded?: boolean;
  as?: "div" | "section" | "article" | "li" | "aside";
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag className={cardClasses({ variant, padded, className })} {...props}>
      {children}
    </Tag>
  );
}

/** Small uppercase heading for a card's section. */
export function CardTitle({
  children,
  as: Tag = "h2",
  className,
  action,
}: {
  children: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn("mb-4 flex items-center justify-between gap-3", className)}
    >
      <Tag className="font-sans text-xs font-medium uppercase tracking-widest text-zinc-500">
        {children}
      </Tag>
      {action}
    </div>
  );
}
