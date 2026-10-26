import { db } from "src/db";
import { categoriesTable, productTagsTable, productsTable } from "src/schema";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";

export interface ProductSuggestion {
  name: string;
  slug: string;
  /** Lowest variant price, decimal string; null if no variants. */
  price: string | null;
  image: string | null;
}

export interface CategorySuggestion {
  name: string;
  slug: string;
}

export interface Suggestions {
  products: ProductSuggestion[];
  categories: CategorySuggestion[];
}

/** Escapes LIKE wildcards so user input matches literally. */
function likeEscape(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class SearchRepository {
  // Type-ahead suggestions. Case-insensitive substring match; names that
  // start with the query rank first. Only public, live records. Stores are
  // anonymous to buyers, so they're never suggested.
  async suggest(
    query: string,
    limits = { products: 6, categories: 3 },
  ): Promise<Suggestions> {
    const term = likeEscape(query.trim());
    const anywhere = `%${term}%`;
    const prefix = `${term}%`;

    const [products, categories] = await Promise.all([
      db
        .select({
          name: productsTable.name,
          slug: productsTable.slug,
          // Column names are written out with their tables: in a select
          // list Drizzle emits bare names, and a bare "id" here would bind
          // to the subquery's own table.
          price: sql<string | null>`(
            select min(pv.price)::text
            from product_variants pv
            where pv.product_id = ${productsTable}.id
              and pv.deleted_at is null
          )`,
          image: sql<string | null>`(
            select pi.url
            from product_images pi
            where pi.product_id = ${productsTable}.id
              and pi.deleted_at is null
            order by pi.is_primary desc, pi.sort_order asc
            limit 1
          )`,
        })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.status, "active"),
            isNull(productsTable.deletedAt),
            or(
              ilike(productsTable.name, anywhere),
              exists(
                db
                  .select({ one: sql`1` })
                  .from(productTagsTable)
                  .where(
                    and(
                      eq(productTagsTable.productId, productsTable.id),
                      ilike(productTagsTable.tag, anywhere),
                    ),
                  ),
              ),
            ),
          ),
        )
        .orderBy(
          desc(ilike(productsTable.name, prefix)),
          asc(productsTable.name),
        )
        .limit(limits.products),

      db
        .select({ name: categoriesTable.name, slug: categoriesTable.slug })
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.isActive, true),
            isNull(categoriesTable.deletedAt),
            ilike(categoriesTable.name, anywhere),
          ),
        )
        .orderBy(
          desc(ilike(categoriesTable.name, prefix)),
          asc(categoriesTable.name),
        )
        .limit(limits.categories),
    ]);

    return { products, categories };
  }
}
