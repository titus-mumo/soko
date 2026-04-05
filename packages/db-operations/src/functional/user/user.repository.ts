import { db } from "../../db";
import { usersTable } from "../../schema";
import { eq, or, isNull } from "drizzle-orm";

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
    const [res] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, phone));

    if (!res) return "user_not_found";

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  // Used for email+password and phone+password login.
  // Pass null for pass if the user signed up via OAuth or OTP.
  async findUserByEmailOrPhone(
    subject: string,
    pass: string | null,
  ): Promise<FindUserResponse> {
    const [res] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, subject), eq(usersTable.phone, subject)));

    if (!res) return "user_not_found";

    if (res.passwordHash) {
      if (!pass) return "incorrect_password";

      const isPasswordCorrect = Bun.password.verifySync(pass, res.passwordHash);
      if (!isPasswordCorrect) return "incorrect_password";
    }

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

    if (res.passwordHash) {
      if (!pass) return "incorrect_password";

      const isPasswordCorrect = Bun.password.verifySync(pass, res.passwordHash);
      if (!isPasswordCorrect) return "incorrect_password";
    }

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
  }

  async findUserById(id: string): Promise<PublicUser | null> {
    const [res] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!res) return null;

    const { passwordHash: _passwordHash, ...publicUser } = res;
    return publicUser as PublicUser;
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
    const [res] = await db
      .update(usersTable)
      .set({ ...data, updatedAt: new Date() })
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
