"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useParams, useRouter } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import {
  getAdminProduct,
  updateProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  replaceProductTags,
  addProductImage,
  setPrimaryImage,
  deleteProductImage,
} from "@/lib/products.api";
import { toast } from "@/store/toast.store";
import { ImageUploader } from "@/components/products/ImageUploader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { SafeImage } from "@/components/ui/SafeImage";
import { ProductStatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage, cn } from "@/lib/utils";
import {
  cleanVariant,
  parseTags,
  type ProductFormValues,
} from "@/lib/validations/product";
import type { Product, ProductImage, ProductVariant } from "@/lib/types";

type EditableProduct = Product & {
  variants: ProductVariant[];
  images: ProductImage[];
  tags: string[];
};

// ─── Image manager ────────────────────────────────────────────────────────────

function ImageManager({
  product,
  onRefresh,
}: {
  product: EditableProduct;
  onRefresh: () => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductImage | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);
    try {
      await addProductImage(product.id, {
        url: url.trim(),
        isPrimary: product.images.length === 0,
        sortOrder: product.images.length,
      });
      setUrl("");
      await onRefresh();
      toast.success("Image added");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to add image"));
    } finally {
      setAdding(false);
    }
  };

  // Uploaded photos are added in order; the first becomes primary if the
  // listing has none yet.
  const handleUploaded = async (urls: string[]) => {
    for (const [i, url] of urls.entries())
      await addProductImage(product.id, {
        url,
        isPrimary: product.images.length === 0 && i === 0,
        sortOrder: product.images.length + i,
      });
    await onRefresh();
  };

  const handleSetPrimary = async (img: ProductImage) => {
    if (img.isPrimary) return;
    setBusy(img.id);
    try {
      await setPrimaryImage(product.id, img.id);
      await onRefresh();
      toast.success("Primary image updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update primary image"));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusy(pendingDelete.id);
    try {
      await deleteProductImage(product.id, pendingDelete.id);
      await onRefresh();
      toast.success("Image removed");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to remove image"));
    } finally {
      setBusy(null);
      setPendingDelete(null);
    }
  };

  const images = product.images
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="space-y-4">
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className={cn(
                "overflow-hidden rounded-md border",
                img.isPrimary
                  ? "border-brand-500"
                  : "border-zinc-200 dark:border-zinc-800",
              )}
            >
              <div className="relative aspect-square w-full bg-zinc-50 dark:bg-zinc-900">
                <SafeImage
                  src={img.url}
                  alt={`${product.name} — photo ${images.indexOf(img) + 1}${img.isPrimary ? " (primary)" : ""}`}
                  fill
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center gap-1 border-t border-zinc-100 p-1.5 dark:border-zinc-800">
                {img.isPrimary ? (
                  <span className="flex-1 px-1 text-[11px] font-medium text-brand-600 dark:text-brand-400">
                    Primary
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    isLoading={busy === img.id}
                    onClick={() => handleSetPrimary(img)}
                  >
                    Set primary
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  disabled={busy === img.id}
                  onClick={() => setPendingDelete(img)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
          No images yet. Upload some below.
        </p>
      )}

      <ImageUploader onUploaded={handleUploaded} />

      <form onSubmit={handleAdd} className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            label="Or add an image link"
            hideLabel
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <Button type="submit" isLoading={adding} disabled={!url.trim()}>
          Add image
        </Button>
      </form>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Or paste an image link. The first image becomes the primary.
      </p>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove image"
        message="This image will be removed from the listing."
        confirmLabel="Remove"
        destructive
        loading={busy === pendingDelete?.id}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<EditableProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "images">("details");

  const fetchProduct = useCallback(async () => {
    try {
      // One request; throws (404) for an unknown listing.
      setProduct(await getAdminProduct(id));
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleSubmit = async (values: ProductFormValues) => {
    if (!product) return;

    await updateProduct(id, {
      name: values.name,
      slug: values.slug,
      description: values.description || undefined,
      categoryId: values.categoryId,
      condition: values.condition,
    });

    // Variants: update the ones that still exist, add new, delete removed.
    const keptIds = new Set(values.variants.map((v) => v.id).filter(Boolean));
    await Promise.all([
      ...values.variants.map((v) =>
        v.id
          ? updateVariant(id, v.id, cleanVariant(v))
          : addVariant(id, cleanVariant(v)),
      ),
      ...product.variants
        .filter((v) => !keptIds.has(v.id))
        .map((v) => deleteVariant(id, v.id)),
    ]);

    const tags = parseTags(values.tags);
    if (tags.join(",") !== product.tags.join(",")) {
      await replaceProductTags(id, tags);
    }

    toast.success("Listing updated");
    router.push("/admin/products");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-md" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon="package"
          title="Listing not found"
          description="It may have been deleted, or it belongs to another store."
          action={
            <ButtonLink href="/admin/products" variant="secondary" size="sm">
              Back to listings
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => router.push("/admin/products")}
          className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <Icon name="chevron-left" size={14} />
          My listings
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Edit listing
          </h1>
          <ProductStatusBadge status={product.status} />
        </div>
        <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
          {product.name}
        </p>
      </div>

      <div className="flex gap-1 rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
        {(["details", "images"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded py-1.5 text-xs font-medium capitalize transition-colors",
              activeTab === tab
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {tab}
            {tab === "images" && ` (${product.images.length})`}
          </button>
        ))}
      </div>

      {activeTab === "details" ? (
        <ProductForm
          initialData={product}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
        />
      ) : (
        <ImageManager product={product} onRefresh={fetchProduct} />
      )}
    </div>
  );
}
