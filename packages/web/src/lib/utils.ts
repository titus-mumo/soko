export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Pulls the server's `message` out of an axios error, with a fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } }).response?.data
      ?.message ?? fallback
  );
}

export function formatKES(amount: number | string | null | undefined): string {
  return `KES ${Number(amount ?? 0).toLocaleString("en-KE", {
    maximumFractionDigits: 2,
  })}`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "2 hours ago", "yesterday", "just now". */
export function relativeTime(date: string | Date, now = Date.now()): string {
  const seconds = Math.round((new Date(date).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size)
      return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** Short order reference shown to people: last 8 chars of the id. */
export function orderRef(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}
