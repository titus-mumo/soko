/** Title block shared by the auth forms. */
export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-zinc-950 dark:text-white">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export const authLinkClass =
  "rounded font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-400";
