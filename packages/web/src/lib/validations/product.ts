import { z } from "zod";

const variantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price (e.g. 1500.00)"),
  stockQuantity: z.coerce
    .number()
    .min(0, "Stock cannot be negative")
    .optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers, and hyphens only",
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  categoryId: z.string().min(1, "Select a category"),
  condition: z.enum(["new", "used", "refurbished"], {
    required_error: "Select a condition",
  }),
  variants: z.array(variantSchema).min(1, "Add at least one variant"),
  tags: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
