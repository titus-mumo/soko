"use client";

import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { createProduct } from "@/lib/products.api";
import { toast } from "@/store/toast.store";
import {
  cleanVariant,
  parseTags,
  type ProductFormValues,
} from "@/lib/validations/product";

export default function NewProductPage() {
  const router = useRouter();

  const handleSubmit = async (values: ProductFormValues) => {
    await createProduct({
      name: values.name,
      slug: values.slug,
      description: values.description || undefined,
      categoryId: values.categoryId,
      condition: values.condition,
      variants: values.variants.map(cleanVariant),
      images: (values.images ?? []).map((img, i) => ({
        url: img.url,
        isPrimary: i === 0,
        sortOrder: i,
      })),
      tags: parseTags(values.tags),
    });

    toast.success("Listing created as a draft");
    router.push("/seller/products");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          New listing
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          New listings start as drafts. Publish them from My Listings.
        </p>
      </div>
      <ProductForm
        onSubmit={handleSubmit}
        submitLabel="Create listing"
        withImages
      />
    </div>
  );
}
