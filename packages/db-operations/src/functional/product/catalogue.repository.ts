import { db } from "src/db";
import { productTagsTable, productsTable } from "src/schema";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  exists,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
  toPage,
  type Page,
  type PageParams,
} from "../../pagination";

export type CatalogueSort = "newest" | "price_asc" | "price_desc";

/** A product as a listing card needs it — no follow-up requests. */
/**
 * A product card, as sent to browsers: only what a card renders. No store
 * id (stores are anonymous to buyers), no stock counts, no internals.
 */
export interface CatalogueItem {
  id: string;
  name: string;
  slug: string;
  condition: "new" | "used" | "refurbished";
  /** Cheapest variant's price, decimal string. */
  price: string;
  /** That variant's compare-at price, if any. */
  compareAtPrice: string | null;
  image: string | null;
  /** Set when the card can add to cart directly: one variant, in stock. */
  variantId: string | null;
  /** More than one variant — the shopper picks on the product page. */
  hasOptions: boolean;
  soldOut: boolean;
}

/** What the query reads; the extra columns build the cursor and flags. */
type CatalogueRow = Omit<
  CatalogueItem,
  "variantId" | "hasOptions" | "soldOut"
> & {
  createdAt: Date;
  variantCount: number;
  singleVariantId: string | null;
  available: number;
};

const toCard = (r: CatalogueRow): CatalogueItem => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  condition: r.condition,
  price: r.price,
  compareAtPrice: r.compareAtPrice,
  image: r.image,
  variantId: r.available > 0 ? r.singleVariantId : null,
  hasOptions: r.variantCount > 1,
  soldOut: r.available <= 0,
});

export interface CatalogueQuery extends PageParams {
  categoryIds?: string[];
  sellerId?: string;
  q?: string;
  sort?: CatalogueSort;
}

const likeEscape = (input: string) => input.replace(/[\\%_]/g, (c) => `\\${c}`);

export class CatalogueRepository {
  constructor(private readonly holdMinutes: number) {}

  /** One page of live, purchasable products. */
  async browse(query: CatalogueQuery): Promise<Page<CatalogueItem>> {
    const limit = clampLimit(query.limit);
    const sort: CatalogueSort = query.sort ?? "newest";
    const after = decodeCursor(query.cursor);

    // Column names are written with their table: inside a subquery a bare
    // "id" would bind to the subquery's own table.
    const p = sql`${productsTable}`;
    const price = sql<string>`(
      select min(pv.price) from product_variants pv
      where pv.product_id = ${p}.id and pv.deleted_at is null
    )`;
    const compareAtPrice = sql<string | null>`(
      select pv.compare_at_price from product_variants pv
      where pv.product_id = ${p}.id and pv.deleted_at is null
      order by pv.price asc limit 1
    )`;
    const variantCount = sql<number>`(
      select count(*)::int from product_variants pv
      where pv.product_id = ${p}.id and pv.deleted_at is null
    )`;
    const singleVariantId = sql<string | null>`(
      select case when count(*) = 1 then (array_agg(pv.id))[1]::text end
      from product_variants pv
      where pv.product_id = ${p}.id and pv.deleted_at is null
    )`;
    const image = sql<string | null>`(
      select pi.url from product_images pi
      where pi.product_id = ${p}.id and pi.deleted_at is null
      order by pi.is_primary desc, pi.sort_order asc limit 1
    )`;
    const available = sql<number>`greatest(0, (
      select coalesce(sum(pv.stock_quantity), 0) from product_variants pv
      where pv.product_id = ${p}.id and pv.deleted_at is null
    ) - (
      select coalesce(sum(ci.quantity), 0) from cart_items ci
      join product_variants pv on pv.id = ci.product_variant_id
      where pv.product_id = ${p}.id and pv.deleted_at is null
        and ci.deleted_at is null
        and ci.updated_at > now() - make_interval(mins => ${this.holdMinutes})
    ))::int`;

    const filters: (SQL | undefined)[] = [
      eq(productsTable.status, "active"),
      isNull(productsTable.deletedAt),
      // Only products someone can buy.
      sql`${price} is not null`,
      query.categoryIds?.length
        ? inArray(productsTable.categoryId, query.categoryIds)
        : undefined,
      query.sellerId ? eq(productsTable.sellerId, query.sellerId) : undefined,
    ];

    const q = query.q?.trim().slice(0, 64);
    if (q) {
      const pattern = `%${likeEscape(q)}%`;
      filters.push(
        or(
          ilike(productsTable.name, pattern),
          exists(
            db
              .select({ one: sql`1` })
              .from(productTagsTable)
              .where(
                and(
                  eq(productTagsTable.productId, productsTable.id),
                  ilike(productTagsTable.tag, pattern),
                ),
              ),
          ),
        ),
      );
    }

    // The first page also says how many match in total ("24 of 107").
    const total = after
      ? undefined
      : db
          .select({ n: sql<number>`count(*)::int` })
          .from(productsTable)
          .where(and(...filters))
          .then(([r]) => r?.n ?? 0);

    // Keyset: rows after the cursor in the chosen order.
    if (after) {
      const [v, id] = after;
      if (sort === "newest") {
        filters.push(
          or(
            lt(productsTable.createdAt, new Date(v)),
            and(
              eq(productsTable.createdAt, new Date(v)),
              lt(productsTable.id, id),
            ),
          ),
        );
      } else if (sort === "price_asc") {
        filters.push(
          or(
            sql`${price} > ${v}::numeric`,
            and(sql`${price} = ${v}::numeric`, gt(productsTable.id, id)),
          ),
        );
      } else {
        filters.push(
          or(
            sql`${price} < ${v}::numeric`,
            and(sql`${price} = ${v}::numeric`, lt(productsTable.id, id)),
          ),
        );
      }
    }

    const order =
      sort === "newest"
        ? [desc(productsTable.createdAt), desc(productsTable.id)]
        : sort === "price_asc"
          ? [asc(price), asc(productsTable.id)]
          : [desc(price), desc(productsTable.id)];

    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        slug: productsTable.slug,
        condition: productsTable.condition,
        createdAt: productsTable.createdAt,
        price,
        compareAtPrice,
        image,
        variantCount,
        singleVariantId,
        available,
      })
      .from(productsTable)
      .where(and(...filters))
      .orderBy(...order)
      .limit(limit + 1);

    const page = toPage(rows as CatalogueRow[], limit, (r) =>
      sort === "newest"
        ? encodeCursor(r.createdAt, r.id)
        : encodeCursor(r.price, r.id),
    );
    const cards = { ...page, items: page.items.map(toCard) };
    return total ? { ...cards, total: await total } : cards;
  }

  /** Headline numbers for the marketplace (live listings, selling stores). */
  async stats(): Promise<{ products: number; sellers: number }> {
    const [row] = await db
      .select({
        products: sql<number>`count(*)::int`,
        sellers: countDistinct(productsTable.sellerId),
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "active"),
          isNull(productsTable.deletedAt),
        ),
      );
    return {
      products: Number(row?.products ?? 0),
      sellers: Number(row?.sellers ?? 0),
    };
  }
}
