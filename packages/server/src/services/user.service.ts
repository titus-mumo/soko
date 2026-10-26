import { getRepositories } from "../lib/repositories";
import { normalizePhone, type NewUser, type PageParams } from "db-operations";

const { userRepository, userAddressRepository, notificationRepository } =
  getRepositories();

// ─────────────────────────────────────────
// Profile
// ─────────────────────────────────────────

export async function getUserById(userId: string) {
  const user = await userRepository.findUserById(userId);

  if (!user) return "user_not_found" as const;

  return user;
}

export async function updateProfile(
  userId: string,
  data: Partial<Pick<NewUser, "name" | "email" | "phone" | "profilePhoto">>,
): Promise<
  | "user_not_found"
  | "email_taken"
  | "phone_taken"
  | Awaited<ReturnType<typeof userRepository.updateUser>>
> {
  // Check email uniqueness if email is being changed.
  if (data.email) {
    const existing = await userRepository.findUserByEmail(data.email);
    if (existing !== "user_not_found" && (existing as any).id !== userId) {
      return "email_taken";
    }
  }

  // Check phone uniqueness if phone is being changed.
  if (data.phone) {
    const phone = normalizePhone(data.phone);
    data = { ...data, phone };
    const existing = await userRepository.findUserByPhone(phone);
    if (existing !== "user_not_found" && (existing as any).id !== userId) {
      return "phone_taken";
    }
  }

  const updated = await userRepository.updateUser(userId, data);
  if (!updated) return "user_not_found";

  return updated;
}

export async function changePassword(
  userId: string,
  data: { currentPassword: string; newPassword: string },
): Promise<"user_not_found" | "incorrect_password" | "password_changed"> {
  // Re-authenticate with the current password before allowing the change.
  // The login lookup takes an email or phone, not an id.
  const account = await userRepository.findUserById(userId);
  if (!account) return "user_not_found";

  const user = await userRepository.findUserByEmailOrPhone(
    account.email,
    data.currentPassword,
  );

  if (user === "user_not_found") return "user_not_found";
  if (user === "incorrect_password") return "incorrect_password";
  if (user === "something_went_wrong") throw new Error("Auth error");

  await userRepository.updateUser(userId, {
    passwordHash: data.newPassword, // hashed inside the repository
  });

  return "password_changed";
}

// ─────────────────────────────────────────
// Addresses
// ─────────────────────────────────────────

export async function getUserAddresses(userId: string) {
  return await userAddressRepository.findAllAddressesByUserId(userId);
}

export async function addAddress(
  userId: string,
  data: {
    label: string;
    county: string;
    town: string;
    street?: string;
    latitude?: string;
    longitude?: string;
    isDefault?: boolean;
  },
) {
  return await userAddressRepository.insertUserAddress({
    userId,
    ...data,
  });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  data: Partial<{
    label: string;
    county: string;
    town: string;
    street: string;
    latitude: string;
    longitude: string;
    isDefault: boolean;
  }>,
) {
  const result = await userAddressRepository.updateUserAddress(
    addressId,
    userId,
    data,
  );

  if (result === "address_not_found") return "address_not_found" as const;

  return result;
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const result = await userAddressRepository.setDefaultAddress(
    addressId,
    userId,
  );

  if (result === "address_not_found") return "address_not_found" as const;

  return result;
}

export async function removeAddress(userId: string, addressId: string) {
  return await userAddressRepository.softDeleteAddress(addressId, userId);
}

// ─────────────────────────────────────────
// Admin
// ─────────────────────────────────────────

export async function getAllUsers(page?: PageParams) {
  return await userRepository.pageUsers(page);
}

export async function updateUserRole(
  userId: string,
  role: "buyer" | "seller" | "admin",
) {
  const user = await userRepository.findUserById(userId);
  if (!user) return "user_not_found" as const;

  await userRepository.updateUserRole(userId, role);

  // Notify the user of their role change.
  await notificationRepository.insertNotification({
    userId,
    type: "role_update",
    title: "Account Updated",
    body: `Your account role has been updated to ${role}.`,
    channel: "push",
  });

  return "role_updated" as const;
}

export async function verifyUser(userId: string) {
  const user = await userRepository.findUserById(userId);
  if (!user) return "user_not_found" as const;

  await userRepository.verifyUser(userId);

  await notificationRepository.insertNotification({
    userId,
    type: "account_verified",
    title: "Account Verified",
    body: "Your account has been verified successfully.",
    channel: "push",
  });

  return "user_verified" as const;
}

export async function deleteUser(userId: string) {
  const user = await userRepository.findUserById(userId);
  if (!user) return "user_not_found" as const;

  // Soft delete preserves the user's data for audit purposes.
  await userRepository.softDeleteUser(userId);

  return "user_deleted" as const;
}
