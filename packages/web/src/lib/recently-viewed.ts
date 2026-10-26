// Products the buyer opened recently, kept in this browser only. Holds just
// enough to draw a small card without another request.

export interface RecentProduct {
  slug: string;
  name: string;
  image: string | null;
  price: number | null;
  viewedAt: number;
}

const KEY = "soko:recently-viewed";
const LIMIT = 12;

export function getRecentlyViewed(): RecentProduct[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(
  item: Omit<RecentProduct, "viewedAt">,
): void {
  try {
    const rest = getRecentlyViewed().filter((p) => p.slug !== item.slug);
    localStorage.setItem(
      KEY,
      JSON.stringify(
        [{ ...item, viewedAt: Date.now() }, ...rest].slice(0, LIMIT),
      ),
    );
  } catch {
    // storage full or blocked — not worth surfacing
  }
}
