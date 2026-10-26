// The last few searches, kept in this browser only.

const KEY = "soko:recent-searches";
const LIMIT = 6;

export function getRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((s) => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const q = query.trim();
  if (!q) return;
  try {
    const rest = getRecentSearches().filter(
      (s) => s.toLowerCase() !== q.toLowerCase(),
    );
    localStorage.setItem(KEY, JSON.stringify([q, ...rest].slice(0, LIMIT)));
  } catch {
    // storage blocked — not worth surfacing
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
