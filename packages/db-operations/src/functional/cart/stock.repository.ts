import { db } from "src/db";
import { cartItemsTable, cartsTable, productVariantsTable } from "src/schema";
import { and, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";

// Stock is reserved while it sits in someone's cart. A cart line holds its
// quantity until `holdMinutes` after it was last touched; after that it no
// longer blocks other shoppers (the line stays in the cart, but checkout
// re-checks). Every check-and-write below runs in a transaction that locks
// the variant's row, so two shoppers can't both take the last unit.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type StockCheck =
  | { ok: true }
  | { ok: false; reason: "variant_not_found" }
  | { ok: false; reason: "insufficient_stock"; available: number };

const holdCutoff = (holdMinutes: number) =>
  sql`now() - make_interval(mins => ${holdMinutes})`;

/** Quantity of each variant held in carts other than `exceptUserId`'s. */
async function heldInCarts(
  q: Tx | typeof db,
  variantIds: string[],
  holdMinutes: number,
  exceptUserId?: string,
): Promise<Map<string, number>> {
  if (variantIds.length === 0) return new Map();
  const rows = await q
    .select({
      variantId: cartItemsTable.productVariantId,
      held: sql<number>`coalesce(sum(${cartItemsTable.quantity}), 0)::int`,
    })
    .from(cartItemsTable)
    .innerJoin(cartsTable, eq(cartsTable.id, cartItemsTable.cartId))
    .where(
      and(
        inArray(cartItemsTable.productVariantId, variantIds),
        isNull(cartItemsTable.deletedAt),
        gt(cartItemsTable.updatedAt, holdCutoff(holdMinutes)),
        exceptUserId ? ne(cartsTable.userId, exceptUserId) : undefined,
      ),
    )
    .groupBy(cartItemsTable.productVariantId);
  return new Map(rows.map((r) => [r.variantId, Number(r.held)]));
}

/** Locks a variant row for the rest of the transaction; null if it's gone. */
async function lockVariant(tx: Tx, variantId: string) {
  const [v] = await tx
    .select({
      id: productVariantsTable.id,
      stock: productVariantsTable.stockQuantity,
    })
    .from(productVariantsTable)
    .where(
      and(
        eq(productVariantsTable.id, variantId),
        isNull(productVariantsTable.deletedAt),
      ),
    )
    .for("update");
  return v ?? null;
}

/** Thrown inside a transaction to roll it back with the reason. */
class StockShortfall extends Error {
  constructor(
    readonly check: StockCheck & { ok: false },
    readonly variantId: string,
  ) {
    super("stock_shortfall");
  }
}

export class StockRepository {
  constructor(private readonly holdMinutes: number) {}

  /**
   * What's left for a shopper: stock minus what other shoppers hold. With no
   * user (public pages), everyone's holds count.
   */
  async availableQuantities(
    variantIds: string[],
    forUserId?: string,
  ): Promise<Map<string, number>> {
    if (variantIds.length === 0) return new Map();
    const [variants, held] = await Promise.all([
      db
        .select({
          id: productVariantsTable.id,
          stock: productVariantsTable.stockQuantity,
        })
        .from(productVariantsTable)
        .where(inArray(productVariantsTable.id, variantIds)),
      heldInCarts(db, variantIds, this.holdMinutes, forUserId),
    ]);
    return new Map(
      variants.map((v) => [v.id, Math.max(0, v.stock - (held.get(v.id) ?? 0))]),
    );
  }

  /**
   * Puts `quantity` more of a variant in the user's cart, if their line's
   * new total fits in what other shoppers aren't holding.
   */
  async addToCart(
    cartId: string,
    userId: string,
    variantId: string,
    quantity: number,
  ): Promise<StockCheck> {
    return await db.transaction(async (tx) => {
      const variant = await lockVariant(tx, variantId);
      if (!variant) return { ok: false, reason: "variant_not_found" } as const;

      const held =
        (await heldInCarts(tx, [variantId], this.holdMinutes, userId)).get(
          variantId,
        ) ?? 0;
      const available = Math.max(0, variant.stock - held);

      const [line] = await tx
        .select()
        .from(cartItemsTable)
        .where(
          and(
            eq(cartItemsTable.cartId, cartId),
            eq(cartItemsTable.productVariantId, variantId),
            isNull(cartItemsTable.deletedAt),
          ),
        );
      const total = (line?.quantity ?? 0) + quantity;
      if (total > available)
        return { ok: false, reason: "insufficient_stock", available } as const;

      if (line) {
        await tx
          .update(cartItemsTable)
          .set({ quantity: total, updatedAt: new Date() })
          .where(eq(cartItemsTable.id, line.id));
      } else {
        await tx
          .insert(cartItemsTable)
          .values({ cartId, productVariantId: variantId, quantity });
      }
      return { ok: true } as const;
    });
  }

  /** Sets a cart line to an exact quantity, within what's available. */
  async setCartQuantity(
    cartId: string,
    userId: string,
    cartItemId: string,
    quantity: number,
  ): Promise<StockCheck | { ok: false; reason: "cart_item_not_found" }> {
    return await db.transaction(async (tx) => {
      const [line] = await tx
        .select()
        .from(cartItemsTable)
        .where(
          and(
            eq(cartItemsTable.id, cartItemId),
            eq(cartItemsTable.cartId, cartId),
            isNull(cartItemsTable.deletedAt),
          ),
        );
      if (!line) return { ok: false, reason: "cart_item_not_found" } as const;

      const variant = await lockVariant(tx, line.productVariantId);
      if (!variant) return { ok: false, reason: "variant_not_found" } as const;

      const held =
        (
          await heldInCarts(
            tx,
            [line.productVariantId],
            this.holdMinutes,
            userId,
          )
        ).get(line.productVariantId) ?? 0;
      const available = Math.max(0, variant.stock - held);
      // Lowering a quantity is always allowed, even if stock fell meanwhile.
      if (quantity > line.quantity && quantity > available)
        return { ok: false, reason: "insufficient_stock", available } as const;

      await tx
        .update(cartItemsTable)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(cartItemsTable.id, line.id));
      return { ok: true } as const;
    });
  }

  /** Renews the hold on everything in a cart (the shopper is active). */
  async touchCart(cartId: string): Promise<void> {
    await db
      .update(cartItemsTable)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(cartItemsTable.cartId, cartId),
          isNull(cartItemsTable.deletedAt),
        ),
      );
  }

  /**
   * Checkout: takes stock for every line or none. Each line must fit in
   * what other shoppers aren't holding; the buyer's own hold is theirs.
   */
  async takeForOrder(
    userId: string,
    lines: { variantId: string; quantity: number }[],
  ): Promise<StockCheck & { variantId?: string }> {
    // Lock in a stable order so concurrent checkouts can't deadlock.
    const sorted = [...lines].sort((a, b) =>
      a.variantId.localeCompare(b.variantId),
    );
    try {
      await db.transaction(async (tx) => {
        for (const line of sorted) {
          const variant = await lockVariant(tx, line.variantId);
          if (!variant)
            throw new StockShortfall(
              { ok: false, reason: "variant_not_found" },
              line.variantId,
            );
          const held =
            (
              await heldInCarts(tx, [line.variantId], this.holdMinutes, userId)
            ).get(line.variantId) ?? 0;
          const available = Math.max(0, variant.stock - held);
          if (line.quantity > available)
            throw new StockShortfall(
              { ok: false, reason: "insufficient_stock", available },
              line.variantId,
            );
          await tx
            .update(productVariantsTable)
            .set({
              stockQuantity: variant.stock - line.quantity,
              updatedAt: new Date(),
            })
            .where(eq(productVariantsTable.id, line.variantId));
        }
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof StockShortfall)
        return { ...err.check, variantId: err.variantId };
      throw err;
    }
  }
}
