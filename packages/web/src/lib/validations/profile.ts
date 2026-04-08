import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const addressSchema = z.object({
  label: z.string().min(1, "Enter a label (e.g. Home, Work)"),
  town: z.string().min(2, "Enter a town or city"),
  county: z.string().min(2, "Enter a county"),
  street: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const sellerOnboardSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters"),
  storeSlug: z
    .string()
    .min(2, "Store slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers, and hyphens only",
    ),
  storeDescription: z.string().optional(),
  storeLogo: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type AddressValues = z.infer<typeof addressSchema>;
export type SellerOnboardValues = z.infer<typeof sellerOnboardSchema>;
