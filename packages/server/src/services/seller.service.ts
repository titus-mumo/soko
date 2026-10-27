import { getRepositories } from "../lib/repositories";

const { sellerProfileRepository, userRepository, notificationRepository } =
  getRepositories();

// ─────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// Profile Management
// ─────────────────────────────────────────

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
