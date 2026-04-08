"use client";

import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { createProduct } from "@/lib/products.api";
import { toast } from "@/store/toast.store";
import type { ProductFormValues } from "@/lib/validations/product";

export default function NewProductPage() {
  const router = useRouter();

  const handleSubmit = async (values: ProductFormValues) => {
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    await createProduct({
      name: values.name,
      slug: values.slug,
      description: values.description,
      categoryId: values.categoryId,
      condition: values.condition,
      variants: values.variants,
      tags,
    });

    toast.success("Listing created");
    router.push("/seller/products");
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          New listing
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Add a product to your store
        </p>
      </div>
      <ProductForm onSubmit={handleSubmit} submitLabel="Create listing" />
    </div>
  );
}
