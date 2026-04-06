import { getRepositories } from "../lib/repositories";
import type { NewSellerProfile } from "db-operations";

const { sellerProfileRepository, userRepository, notificationRepository } =
  getRepositories();

// ─────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────

// Creates a seller profile and upgrades the user's role to seller.
export async function createSellerProfile(
  userId: string,
  data: {
    storeName: string;
    storeSlug: string;
    storeDescription?: string;
    storeLogo?: string;
  },
): Promise<
  | "user_not_found"
  | "seller_profile_exists"
  | "slug_taken"
  | Awaited<ReturnType<typeof sellerProfileRepository.insertSellerProfile>>
> {
  const user = await userRepository.findUserById(userId);
  if (!user) return "user_not_found";

  // Prevent duplicate seller profiles for the same user.
  const existing =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (existing !== "seller_not_found") return "seller_profile_exists";

  // Ensure the store slug is unique across all sellers.
  const slugTaken = await sellerProfileRepository.findSellerProfileBySlug(
    data.storeSlug,
  );
  if (slugTaken !== "seller_not_found") return "slug_taken";

  const profile = await sellerProfileRepository.insertSellerProfile({
    userId,
    ...data,
  });

  // Upgrade user role to seller.
  await userRepository.updateUserRole(userId, "seller");

  await notificationRepository.insertNotification({
    userId,
    type: "seller_onboarded",
    title: "Welcome to Soko Seller!",
    body: "Your seller profile has been created. Start listing your products.",
    channel: "push",
  });

  return profile;
}

// ─────────────────────────────────────────
// Profile Management
// ─────────────────────────────────────────

export async function getSellerProfile(userId: string) {
  const profile =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (profile === "seller_not_found") return "seller_not_found" as const;
  return profile;
}

export async function getSellerProfileBySlug(slug: string) {
  const profile = await sellerProfileRepository.findSellerProfileBySlug(slug);
  if (profile === "seller_not_found") return "seller_not_found" as const;
  return profile;
}

export async function updateSellerProfile(
  userId: string,
  data: Partial<
    Pick<
      NewSellerProfile,
      "storeName" | "storeSlug" | "storeDescription" | "storeLogo"
    >
  >,
): Promise<
  | "seller_not_found"
  | "slug_taken"
  | Awaited<ReturnType<typeof sellerProfileRepository.updateSellerProfile>>
> {
  // Check slug uniqueness if slug is being changed.
  if (data.storeSlug) {
    const existing = await sellerProfileRepository.findSellerProfileBySlug(
      data.storeSlug,
    );
    if (
      existing !== "seller_not_found" &&
      (existing as any).userId !== userId
    ) {
      return "slug_taken";
    }
  }

  return await sellerProfileRepository.updateSellerProfile(userId, data);
}

export async function uploadVerificationDoc(
  userId: string,
  docUrl: string,
): Promise<"seller_not_found" | "doc_uploaded"> {
  const result = await sellerProfileRepository.addVerificationDoc(
    userId,
    docUrl,
  );
  if (result === "seller_not_found") return "seller_not_found";
  return "doc_uploaded";
}

// ─────────────────────────────────────────
// Admin
// ─────────────────────────────────────────

export async function verifySeller(
  userId: string,
): Promise<"seller_not_found" | "seller_verified"> {
  const result = await sellerProfileRepository.verifySeller(userId);
  if (result === "seller_not_found") return "seller_not_found";

  await notificationRepository.insertNotification({
    userId,
    type: "seller_verified",
    title: "Seller Account Verified",
    body: "Your seller account has been verified. You can now list products.",
    channel: "push",
  });

  return "seller_verified";
}

export async function updateSellerRating(
  userId: string,
  rating: string,
): Promise<"seller_not_found" | "rating_updated"> {
  const result = await sellerProfileRepository.updateRating(userId, rating);
  if (result === "seller_not_found") return "seller_not_found";
  return "rating_updated";
}

export async function deleteSellerProfile(
  userId: string,
): Promise<"seller_not_found" | "seller_deleted"> {
  const result = await sellerProfileRepository.softDeleteSellerProfile(userId);
  if (!result) return "seller_not_found";

  // Downgrade user role back to buyer.
  await userRepository.updateUserRole(userId, "buyer");

  await notificationRepository.insertNotification({
    userId,
    type: "seller_deleted",
    title: "Seller Account Closed",
    body: "Your seller account has been closed.",
    channel: "push",
  });

  return "seller_deleted";
}
