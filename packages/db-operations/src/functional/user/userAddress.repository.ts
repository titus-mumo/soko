import { db } from "src/db";
import { userAddressesTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

export type UserAddress = typeof userAddressesTable.$inferSelect;
export type NewUserAddress = typeof userAddressesTable.$inferInsert;

export type FindUserAddressResponse =
  | UserAddress
  | "address_not_found"
  | "user_not_found";

export class UserAddressRepository {
  async insertUserAddress(
    userAddress: NewUserAddress,
  ): Promise<UserAddress | null> {
    if (userAddress.isDefault) {
      await this.clearDefaultAddress(userAddress.userId);
    }

    const [res] = await db
      .insert(userAddressesTable)
      .values(userAddress)
      .returning();

    return res ?? null;
  }

  async updateUserAddress(
    id: string,
    userId: string,
    data: Partial<NewUserAddress>,
  ): Promise<FindUserAddressResponse> {
    if (data.isDefault) {
      await this.clearDefaultAddress(userId);
    }

    const [res] = await db
      .update(userAddressesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(userAddressesTable.id, id),
          eq(userAddressesTable.userId, userId),
          isNull(userAddressesTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "address_not_found";

    return res;
  }

  async findAddressById(
    id: string,
    userId: string,
  ): Promise<FindUserAddressResponse> {
    const [res] = await db
      .select()
      .from(userAddressesTable)
      .where(
        and(
          eq(userAddressesTable.id, id),
          eq(userAddressesTable.userId, userId),
          isNull(userAddressesTable.deletedAt),
        ),
      );

    if (!res) return "address_not_found";

    return res;
  }

  async findAllAddressesByUserId(userId: string): Promise<UserAddress[]> {
    return await db
      .select()
      .from(userAddressesTable)
      .where(
        and(
          eq(userAddressesTable.userId, userId),
          isNull(userAddressesTable.deletedAt),
        ),
      );
  }

  async findDefaultAddress(userId: string): Promise<FindUserAddressResponse> {
    const [res] = await db
      .select()
      .from(userAddressesTable)
      .where(
        and(
          eq(userAddressesTable.userId, userId),
          eq(userAddressesTable.isDefault, true),
          isNull(userAddressesTable.deletedAt),
        ),
      );

    if (!res) return "address_not_found";

    return res;
  }

  async setDefaultAddress(
    id: string,
    userId: string,
  ): Promise<FindUserAddressResponse> {
    await this.clearDefaultAddress(userId);

    const [res] = await db
      .update(userAddressesTable)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(userAddressesTable.id, id),
          eq(userAddressesTable.userId, userId),
          isNull(userAddressesTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "address_not_found";

    return res;
  }

  async softDeleteAddress(id: string, userId: string): Promise<boolean> {
    const [res] = await db
      .update(userAddressesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isDefault: false })
      .where(
        and(
          eq(userAddressesTable.id, id),
          eq(userAddressesTable.userId, userId),
          isNull(userAddressesTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  async hardDeleteAddress(id: string, userId: string): Promise<boolean> {
    const res = await db
      .delete(userAddressesTable)
      .where(
        and(
          eq(userAddressesTable.id, id),
          eq(userAddressesTable.userId, userId),
        ),
      )
      .returning();

    return res.length > 0;
  }

  private async clearDefaultAddress(userId: string): Promise<void> {
    await db
      .update(userAddressesTable)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(userAddressesTable.userId, userId),
          eq(userAddressesTable.isDefault, true),
          isNull(userAddressesTable.deletedAt),
        ),
      );
  }
}
