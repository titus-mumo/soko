import { db } from "../../db";
import { pageNewestFirst, type Page, type PageParams } from "../../pagination";
import { usersTable } from "../../schema";
import { and, eq, ilike, inArray, ne, or, isNull, sql } from "drizzle-orm";
import { phoneVariants } from "../../phone";

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type PublicUser = Omit<User, "passwordHash">;

export type FindUserResponse =
  | PublicUser
  | "something_went_wrong"
  | "user_not_found"
  | "incorrect_password";

export class UserRepository {
  async insertUser(user: NewUser): Promise<PublicUser | null> {
    let hash: string | null = null;

    if (user.passwordHash) {
      hash = Bun.password.hashSync(user.passwordHash);
    }

    const [res] = await db
      .insert(usersTable)
      .values({ ...user, passwordHash: hash })
      .returning();

    if (!res) return null;

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  async findUserByEmail(email: string): Promise<FindUserResponse> {
    const [res] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!res) return "user_not_found";

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  async findUserByPhone(phone: string): Promise<FindUserResponse> {
    // Match any format the number may be stored in; an active account wins
    // over a deleted one with the same number.
    const [res] = await db
      .select()
      .from(usersTable)
      .where(inArray(usersTable.phone, phoneVariants(phone)))
      .orderBy(sql`${usersTable.deletedAt} is not null`)
      .limit(1);

    if (!res) return "user_not_found";

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  // Used for email+password and phone+password login.
  // Pass null for pass if the user signed up via OAuth or OTP.
  // Deleted accounts can't sign in.
  async findUserByEmailOrPhone(
    subject: string,
    pass: string | null,
  ): Promise<FindUserResponse> {
    const [res] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          or(
            eq(usersTable.email, subject),
            inArray(usersTable.phone, phoneVariants(subject)),
          ),
          isNull(usersTable.deletedAt),
        ),
      );

    if (!res) return "user_not_found";

    // No password set (Google sign-ups, the house store account): password
    // sign-in isn't available. Never let a missing hash mean "any password".
    if (!res.passwordHash || !pass) return "incorrect_password";
    if (!Bun.password.verifySync(pass, res.passwordHash))
      return "incorrect_password";

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  async findUserByEmailOrName(
    subject: string,
    pass: string | null,
  ): Promise<FindUserResponse> {
    const [res] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, subject), eq(usersTable.name, subject)));

    if (!res) return "user_not_found";

    // No password set (Google sign-ups, the house store account): password
    // sign-in isn't available. Never let a missing hash mean "any password".
    if (!res.passwordHash || !pass) return "incorrect_password";
    if (!Bun.password.verifySync(pass, res.passwordHash))
      return "incorrect_password";

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  /**
   * Accounts whose name or email contains `query`, or whose phone matches it
   * in any stored form (07…, 254…, +254…). For picking recipients, so it
   * leaves out deleted accounts and the house store's system account.
   */
  async searchUsers(query: string, limit = 8): Promise<PublicUser[]> {
    const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const digits = query.replace(/\D/g, "");
    const rows = await db
      .select()
      .from(usersTable)
      .where(
        and(
          isNull(usersTable.deletedAt),
          ne(usersTable.phone, "house-store"),
          or(
            ilike(usersTable.name, like),
            ilike(usersTable.email, like),
            inArray(usersTable.phone, phoneVariants(query)),
            // Part of a number (e.g. the last few digits).
            digits.length >= 4
              ? ilike(usersTable.phone, `%${digits}%`)
              : undefined,
          ),
        ),
      )
      .orderBy(usersTable.name)
      .limit(limit);
    return rows.map(
      ({ passwordHash: _passwordHash, ...publicUser }) =>
        publicUser as PublicUser,
    );
  }

  /** Ids of active admin accounts (for alert notifications). */
  async findAdminIds(): Promise<string[]> {
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.role, "admin"), isNull(usersTable.deletedAt)));
    return rows.map((r) => r.id);
  }

  /** Whether the account has a password (Google sign-ups start without). */
  async hasPassword(id: string): Promise<boolean> {
    const [res] = await db
      .select({ hash: usersTable.passwordHash })
      .from(usersTable)
      .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)));
    return !!res?.hash;
  }

  async findUserById(id: string): Promise<PublicUser | null> {
    const [res] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, id), isNull(usersTable.deletedAt)));

    if (!res) return null;

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  // Paged, newest first, without password hashes.
  async pageUsers(params?: PageParams): Promise<Page<PublicUser>> {
    const page = await pageNewestFirst<User>(
      usersTable,
      isNull(usersTable.deletedAt),
      params,
    );
    return {
      ...page,
      items: page.items.map(
        ({ passwordHash: _passwordHash, ...publicUser }) =>
          publicUser as PublicUser,
      ),
    };
  }

  async findAllUsers(): Promise<PublicUser[]> {
    const users = await db
      .select()
      .from(usersTable)
      .where(isNull(usersTable.deletedAt));

    return users.map(
      ({ passwordHash: _passwordHash, ...publicUser }) =>
        publicUser as PublicUser,
    );
  }

  async updateUser(
    id: string,
    data: Partial<Omit<NewUser, "id" | "createdAt">>,
  ): Promise<PublicUser | null> {
    // Callers pass a plain password in passwordHash; hash it like insertUser.
    const values = data.passwordHash
      ? { ...data, passwordHash: Bun.password.hashSync(data.passwordHash) }
      : data;

    const [res] = await db
      .update(usersTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();

    if (!res) return null;

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  async updateUserRole(
    id: string,
    role: "buyer" | "seller" | "admin",
  ): Promise<void> {
    await db
      .update(usersTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(usersTable.id, id));
  }

  async verifyUser(id: string): Promise<void> {
    await db
      .update(usersTable)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(usersTable.id, id));
  }

  async softDeleteUser(id: string): Promise<void> {
    await db
      .update(usersTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, id));
  }

  async hardDeleteUser(id: string): Promise<void> {
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }
}
