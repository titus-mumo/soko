"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  productSchema,
  type ProductFormValues,
} from "@/lib/validations/product";
import { getCategories } from "@/lib/categories.api";
import type { Category, Product } from "@/lib/types";

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  submitLabel?: string;
}

export function ProductForm({
  initialData,
  onSubmit,
  submitLabel = "Save product",
}: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          slug: initialData.slug,
          description: initialData.description ?? "",
          categoryId: initialData.categoryId,
          condition: initialData.condition,
          variants: initialData.variants.map((v) => ({
            sku: v.sku,
            price: v.price,
            stockQuantity: v.stockQuantity,
            size: v.size ?? "",
            color: v.color ?? "",
            material: v.material ?? "",
          })),
          tags: initialData.tags.join(", "),
        }
      : {
          condition: "new",
          variants: [{ sku: "", price: "0.00", stockQuantity: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  const handleFormSubmit = async (values: ProductFormValues) => {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Something went wrong. Try again.";
      setServerError(message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Product name"
          placeholder="iPhone 15 Pro"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Slug"
          placeholder="iphone-15-pro"
          error={errors.slug?.message}
          {...register("slug")}
        />
      </div>

      <Textarea
        label="Description (optional)"
        placeholder="Describe the product…"
        rows={4}
        error={errors.description?.message}
        {...register("description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Category"
          placeholder="Select category"
          error={errors.categoryId?.message}
          {...register("categoryId")}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Condition"
          error={errors.condition?.message}
          {...register("condition")}
        >
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </Select>
      </div>

      {/* Variants */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Variants
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ sku: "", price: "0.00", stockQuantity: 0 })}
          >
            + Add variant
          </Button>
        </div>
        {errors.variants?.root && (
          <p className="mb-2 text-xs text-red-500">
            {errors.variants.root.message}
          </p>
        )}
        <div className="space-y-3">
          {fields.map((field, i) => (
            <div
              key={field.id}
              className="rounded-md border border-zinc-100 p-3 dark:border-zinc-800"
            >
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3">
                <Input
                  placeholder="SKU"
                  error={errors.variants?.[i]?.sku?.message}
                  {...register(`variants.${i}.sku`)}
                />
                <Input
                  placeholder="Price (e.g. 1500.00)"
                  error={errors.variants?.[i]?.price?.message}
                  {...register(`variants.${i}.price`)}
                />
                <Input
                  type="number"
                  placeholder="Stock"
                  error={errors.variants?.[i]?.stockQuantity?.message}
                  {...register(`variants.${i}.stockQuantity`)}
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  className="self-start mt-1.5 flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Remove"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <Input
                  placeholder="Size (optional)"
                  {...register(`variants.${i}.size`)}
                />
                <Input
                  placeholder="Color (optional)"
                  {...register(`variants.${i}.color`)}
                />
                <Input
                  placeholder="Material (optional)"
                  {...register(`variants.${i}.material`)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Input
        label="Tags (optional)"
        placeholder="electronics, phone, apple (comma-separated)"
        error={errors.tags?.message}
        {...register("tags")}
      />

      {serverError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" isLoading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
