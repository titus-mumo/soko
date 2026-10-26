// Seeds a local admin account. Safe to re-run: an existing user with the same
// email is promoted to admin instead of duplicated.
//
//   bun run seed:admin

import { UserRepository } from "../index";

const users = new UserRepository();

const ADMIN = {
  name: "Soko Admin",
  email: "admin@soko.test",
  phone: "+254700000001",
  password: "Admin1234",
};

async function main() {
  const existing = await users.findUserByEmail(ADMIN.email);

  if (typeof existing === "string") {
    const created = await users.insertUser({
      name: ADMIN.name,
      email: ADMIN.email,
      phone: ADMIN.phone,
      passwordHash: ADMIN.password, // hashed by the repository
      role: "admin",
      isVerified: true,
    });
    if (!created) throw new Error("Failed to create admin user");
    console.info(`  created admin ${ADMIN.email}`);
  } else {
    if (existing.role !== "admin")
      await users.updateUserRole(existing.id, "admin");
    console.info(`  reusing ${ADMIN.email} (role: admin)`);
  }

  console.info(`\nDone. Sign in as ${ADMIN.email} / ${ADMIN.password}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
