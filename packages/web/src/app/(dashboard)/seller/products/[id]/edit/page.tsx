"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { getSellerProfile } from "@/lib/seller.api";
import { getProductsBySeller, updateProduct } from "@/lib/products.api";
import { toast } from "@/store/toast.store";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Product } from "@/lib/types";
import type { ProductFormValues } from "@/lib/validations/product";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSellerProfile()
      .then((profile) => getProductsBySeller(profile.id))
      .then((prods) => setProduct(prods.find((p) => p.id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: ProductFormValues) => {
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    await updateProduct(id, {
      name: values.name,
      slug: values.slug,
      description: values.description,
      categoryId: values.categoryId,
      condition: values.condition,
    });

    // Tags are managed separately via ReplaceProductTags endpoint
    // Update variants via AddVariant/UpdateVariant — out of scope for this form
    toast.success("Listing updated");
    router.push("/seller/products");
    void tags; // suppress unused warning
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-400 dark:text-zinc-600">
          Product not found
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Edit listing
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {product.name}
        </p>
      </div>
      <ProductForm
        initialData={product}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />
    </div>
  );
}
