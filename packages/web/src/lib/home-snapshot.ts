import snapshot from "@/data/home-snapshot.json";
import type { HomeData } from "./server-api";
import type { CatalogueItem, Category } from "./types";

// The home page as it was when `bun run snapshot:home` last ran, with its
// photos saved under public/home. Shown while the API is asleep, and its
// photos are served from this site even when the API is up.

/** The saved home page, shaped like the live data. */
export const HOME_SNAPSHOT: HomeData = {
  counties: snapshot.counties,
  categories: snapshot.categories as unknown as Category[],
  products: snapshot.products as unknown as CatalogueItem[],
};

const LOCAL_IMAGES: Record<string, string> = snapshot.images;

/** The saved copy of a product photo, when there is one. */
export function localImage(url: string | null): string | null {
  return url ? (LOCAL_IMAGES[url] ?? url) : null;
}
