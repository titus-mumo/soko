import { db } from "src/db";
import { cartsTable } from "src/schema";
import { eq, isNull } from "drizzle-orm";

export type Cart = typeof cartsTable.$inferSelect;
export type NewCart = typeof cartsTable.$inferInsert;

export type FindCartResponse = Cart | "cart_not_found";

export class CartRepository {
  // Creates a cart for a user. Since userId is unique, only one
  // cart per user can exist — enforce this at the service layer before inserting.
  async insertCart(userId: string): Promise<Cart | null> {
    const [res] = await db.insert(cartsTable).values({ userId }).returning();

    return res ?? null;
  }

  async findCartById(id: string): Promise<FindCartResponse> {
    const [res] = await db
      .select()
      .from(cartsTable)
      .where(eq(cartsTable.id, id));

    if (!res) return "cart_not_found";

    return res;
  }

  async findCartByUserId(userId: string): Promise<FindCartResponse> {
    const [res] = await db
      .select()
      .from(cartsTable)
      .where(eq(cartsTable.userId, userId));

    if (!res) return "cart_not_found";

    return res;
  }

  // Finds the cart or creates one if it doesn't exist yet.
  // Use this at the start of any cart interaction to guarantee a cart exists.
  async findOrCreateCart(userId: string): Promise<Cart> {
    const existing = await this.findCartByUserId(userId);

    if (existing !== "cart_not_found") return existing;

    const [res] = await db.insert(cartsTable).values({ userId }).returning();

    return res;
  }

  // Hard delete only — carts are transient and carry no audit history.
  // Cart items will cascade-delete via their foreign key constraint.
  async deleteCartByUserId(userId: string): Promise<boolean> {
    const res = await db
      .delete(cartsTable)
      .where(eq(cartsTable.userId, userId))
      .returning();

    return res.length > 0;
  }
}
