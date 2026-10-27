import { getRepositories } from "./repositories";

// Soko runs the catalogue itself: listings admins create are filed under
// Soko's own store. Every product needs a store record, and every store an
// owning user — so the house store belongs to a system account that can't
// sign in (no password; its "phone" isn't a number an OTP can reach). It's
// deliberately not an admin's account: removing an admin must never take
// the catalogue with it.

export const HOUSE_STORE = { storeName: "Soko", storeSlug: "soko" };
const HOUSE_ACCOUNT = {
  name: "Soko",
  email: "house-store@soko.internal",
  phone: "house-store",
};

let cached: string | null = null;

/** The house store's id, creating it (and its account) on first use. */
export async function houseStoreId(): Promise<string> {
  if (cached) return cached;
  const { sellerProfileRepository, userRepository } = getRepositories();

  const store = await sellerProfileRepository.findSellerProfileBySlug(
    HOUSE_STORE.storeSlug,
  );
  if (store !== "seller_not_found") return (cached = store.id);

  let account = await userRepository.findUserByEmail(HOUSE_ACCOUNT.email);
  if (typeof account === "string") {
    const created = await userRepository.insertUser({
      ...HOUSE_ACCOUNT,
      role: "buyer",
      isVerified: true,
    });
    if (!created) throw new Error("Failed to create the house store account");
    account = created;
  }
  const created = await sellerProfileRepository.insertSellerProfile({
    userId: account.id,
    ...HOUSE_STORE,
    isVerified: true,
  });
  if (!created) throw new Error("Failed to create the house store");
  return (cached = created.id);
}
