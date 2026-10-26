import { getRepositories } from "../lib/repositories";

const { searchRepository } = getRepositories();

const MAX_QUERY = 64;

/** Type-ahead suggestions for the search box. Empty query → empty lists. */
export async function getSuggestions(query: string) {
  const q = query.trim().slice(0, MAX_QUERY);
  if (!q) return { products: [], categories: [] };
  return await searchRepository.suggest(q);
}
