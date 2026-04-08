"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getSellerProfile } from "@/lib/seller.api";
import {
  getProductsBySeller,
  deleteProduct,
  publishProduct,
  unpublishProduct,
} from "@/lib/products.api";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import type { Product } from "@/lib/types";

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await getSellerProfile();
      const prods = await getProductsBySeller(profile.id);
      setProducts(prods);
    } catch {
      // seller may not have a profile yet
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleTogglePublished = async (product: Product) => {
    setTogglingId(product.id);
    try {
      if (product.isPublished) {
        await unpublishProduct(product.id);
      } else {
        await publishProduct(product.id);
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isPublished: !p.isPublished } : p,
        ),
      );
      toast.success(
        product.isPublished ? "Listing unpublished" : "Listing published",
      );
    } catch {
      toast.error("Failed to update listing");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteProduct(confirmDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      toast.success("Listing deleted");
    } catch {
      toast.error("Failed to delete listing");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            My listings
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your products
          </p>
        </div>
        <Link href="/seller/products/new">
          <Button>New listing</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-zinc-400 dark:text-zinc-600">
            No listings yet
          </p>
          <Link href="/seller/products/new" className="mt-4">
            <Button variant="secondary" size="sm">
              Create your first listing
            </Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-md border border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {product.name}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  {product.variants.length} variant
                  {product.variants.length !== 1 ? "s" : ""}
                  {product.category && ` · ${product.category.name}`}
                </p>
              </div>
              <Badge variant={product.isPublished ? "success" : "zinc"}>
                {product.isPublished ? "Published" : "Draft"}
              </Badge>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={togglingId === product.id}
                  onClick={() => handleTogglePublished(product)}
                >
                  {product.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Link href={`/seller/products/${product.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  onClick={() => setConfirmDelete(product)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete listing"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Are you sure you want to delete{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {confirmDelete?.name}
          </span>
          ? This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            isLoading={deletingId !== null}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
