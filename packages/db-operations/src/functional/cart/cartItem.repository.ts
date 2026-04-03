import { db } from "src/db";
import { cartItemsTable } from "src/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export type CartItem = typeof cartItemsTable.$inferSelect;
export type NewCartItem = typeof cartItemsTable.$inferInsert;

export type FindCartItemResponse = CartItem | "cart_item_not_found";

export class CartItemRepository {
  // Adds a variant to the cart. If the variant already exists in the cart,
  // increment its quantity instead of inserting a duplicate row.
  async insertCartItem(
    cartId: string,
    productVariantId: string,
    quantity: number = 1,
  ): Promise<CartItem | null> {
    const existing = await this.findCartItemByVariantId(
      cartId,
      productVariantId,
    );

    if (existing !== "cart_item_not_found") {
      return (await this.adjustQuantity(
        existing.id,
        cartId,
        quantity,
      )) as CartItem;
    }

    const [res] = await db
      .insert(cartItemsTable)
      .values({ cartId, productVariantId, quantity })
      .returning();

    return res ?? null;
  }

  async findCartItemById(
    id: string,
    cartId: string,
  ): Promise<FindCartItemResponse> {
    const [res] = await db
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.id, id),
          eq(cartItemsTable.cartId, cartId),
          isNull(cartItemsTable.deletedAt),
        ),
      );

    if (!res) return "cart_item_not_found";

    return res;
  }

  async findCartItemByVariantId(
    cartId: string,
    productVariantId: string,
  ): Promise<FindCartItemResponse> {
    const [res] = await db
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.cartId, cartId),
          eq(cartItemsTable.productVariantId, productVariantId),
          isNull(cartItemsTable.deletedAt),
        ),
      );

    if (!res) return "cart_item_not_found";

    return res;
  }

  // Returns all active items in a cart.
  // Use this to render the cart summary and calculate totals.
  async findItemsByCartId(cartId: string): Promise<CartItem[]> {
    return await db
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.cartId, cartId),
          isNull(cartItemsTable.deletedAt),
        ),
      );
  }

  // Hard-sets the quantity for a cart item.
  // Use this when the buyer types an exact quantity in the cart UI.
  async setQuantity(
    id: string,
    cartId: string,
    quantity: number,
  ): Promise<FindCartItemResponse> {
    // Remove the item if quantity drops to zero rather than leaving a ghost row.
    if (quantity <= 0) {
      await this.softDeleteCartItem(id, cartId);
      return "cart_item_not_found";
    }

    const [res] = await db
      .update(cartItemsTable)
      .set({ quantity, updatedAt: new Date() })
      .where(
        and(
          eq(cartItemsTable.id, id),
          eq(cartItemsTable.cartId, cartId),
          isNull(cartItemsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "cart_item_not_found";

    return res;
  }

  // Adjusts quantity by a delta — pass positive to increment, negative to decrement.
  // Clamps at 1 to avoid zero or negative quantities without removing the item.
  // To remove the item on zero, call softDeleteCartItem explicitly instead.
  async adjustQuantity(
    id: string,
    cartId: string,
    delta: number,
  ): Promise<FindCartItemResponse> {
    const [res] = await db
      .update(cartItemsTable)
      .set({
        quantity: sql`GREATEST(${cartItemsTable.quantity} + ${delta}, 1)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cartItemsTable.id, id),
          eq(cartItemsTable.cartId, cartId),
          isNull(cartItemsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "cart_item_not_found";

    return res;
  }

  async softDeleteCartItem(id: string, cartId: string): Promise<boolean> {
    const [res] = await db
      .update(cartItemsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(cartItemsTable.id, id),
          eq(cartItemsTable.cartId, cartId),
          isNull(cartItemsTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Clears all items from a cart in one query.
  // Use this after a successful order placement to empty the cart.
  async softDeleteItemsByCartId(cartId: string): Promise<boolean> {
    const res = await db
      .update(cartItemsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(cartItemsTable.cartId, cartId),
          isNull(cartItemsTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  async hardDeleteCartItem(id: string): Promise<boolean> {
    const res = await db
      .delete(cartItemsTable)
      .where(eq(cartItemsTable.id, id))
      .returning();

    return res.length > 0;
  }
}
