import type { IconName } from "@/components/ui/Icon";
import type { Category } from "@/lib/types";

// Categories have an optional `icon` field, but none are set yet. Pick one
// from the slug; anything unknown gets a generic tag.
const BY_KEYWORD: [RegExp, IconName][] = [
  [/laptop|computer/, "laptop"],
  [/phone|mobile/, "phone"],
  [/electronic|audio|tv/, "plug"],
  [/fashion|cloth|wear|shoe/, "shirt"],
  [/home|kitchen|furniture/, "home"],
];

export function categoryIcon(category: Pick<Category, "slug">): IconName {
  return BY_KEYWORD.find(([re]) => re.test(category.slug))?.[1] ?? "tag";
}
