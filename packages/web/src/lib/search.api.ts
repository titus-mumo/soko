import { api } from "./api";
import type { ApiResponse } from "./types";

export interface Suggestions {
  products: {
    name: string;
    slug: string;
    price: string | null;
    image: string | null;
  }[];
  categories: { name: string; slug: string }[];
}

/** Type-ahead suggestions for the search box. */
export async function getSuggestions(
  q: string,
  signal?: AbortSignal,
): Promise<Suggestions> {
  const { data } = await api.get<ApiResponse<Suggestions>>("/search/suggest", {
    params: { q },
    signal,
  });
  return data.data;
}
