import { z } from "zod";
import { kenyanPhoneSchema } from "@/lib/phone";

export const checkoutSchema = z.object({
  deliveryAddressId: z.string().min(1, "Select a delivery address"),
  phone: kenyanPhoneSchema,
  promoCode: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;
