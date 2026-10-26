import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Static public routes only. Product, category and store pages are reachable
// by crawling from these; add them here once the API exposes a cheap
// "list all slugs" endpoint.
const ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/products", changeFrequency: "daily", priority: 0.9 },
  { path: "/delivery", changeFrequency: "monthly", priority: 0.4 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.8 },
  { path: "/register", changeFrequency: "yearly", priority: 0.3 },
  { path: "/login", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
