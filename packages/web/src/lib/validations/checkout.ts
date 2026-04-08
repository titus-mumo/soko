import { z } from "zod";

export const checkoutSchema = z.object({
  deliveryAddressId: z.string().min(1, "Select a delivery address"),
  promoCode: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;
