"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getMyProducts,
  deleteProduct,
  publishProduct,
  unpublishProduct,
} from "@/lib/products.api";
import { toast } from "@/store/toast.store";
import { usePagedList } from "@/hooks/usePagedList";
import { LoadMore } from "@/components/ui/LoadMore";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductStatusBadge } from "@/components/ui/StatusBadge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { SafeImage } from "@/components/ui/SafeImage";
import { cardClasses } from "@/components/ui/Card";
import { apiErrorMessage, cn, formatKES } from "@/lib/utils";
import type { ProductWithMedia } from "@/lib/types";

function priceRange(p: ProductWithMedia): string {
  if (p.variants.length === 0) return "—";
  const prices = p.variants.map((v) => Number(v.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatKES(min) : `${formatKES(min)} – ${formatKES(max)}`;
}

const totalStock = (p: ProductWithMedia) =>
  p.variants.reduce((sum, v) => sum + (v.stockQuantity ?? 0), 0);

type BulkAction = "publish" | "unpublish" | "delete";

export default function SellerProductsPage() {
  // Each page arrives with variants, images and units sold.
  const list = usePagedList((page) => getMyProducts(page), [], {
    errorMessage: "Failed to load your listings",
  });
  const { items: products, setItems: setProducts, loading, error } = list;
  const fetchProducts = () => list.reload();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProductWithMedia | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<BulkAction | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const handleTogglePublished = async (product: ProductWithMedia) => {
    const isLive = product.status === "active";
    setTogglingId(product.id);
    try {
      if (isLive) await unpublishProduct(product.id);
      else await publishProduct(product.id);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, status: isLive ? "draft" : "active" }
            : p,
        ),
      );
      toast.success(isLive ? "Listing unpublished" : "Listing published");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update listing"));
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
      setSelected((s) => {
        const next = new Set(s);
        next.delete(confirmDelete.id);
        return next;
      });
      toast.success("Listing deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete listing"));
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const selectable = products.filter((p) => p.status !== "suspended");
  const allSelected =
    selectable.length > 0 && selectable.every((p) => selected.has(p.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectable.map((p) => p.id)));

  const runBulk = async (action: BulkAction) => {
    const targets = products
      .filter((p) => selected.has(p.id))
      .filter((p) =>
        action === "publish"
          ? p.status !== "active"
          : action === "unpublish"
            ? p.status === "active"
            : true,
      );
    setBulkBusy(action);
    const results = await Promise.allSettled(
      targets.map((p) =>
        action === "publish"
          ? publishProduct(p.id)
          : action === "unpublish"
            ? unpublishProduct(p.id)
            : deleteProduct(p.id),
      ),
    );
    const ok = new Set(
      targets
        .filter((_, i) => results[i].status === "fulfilled")
        .map((p) => p.id),
    );
    const failed = targets.length - ok.size;

    setProducts((prev) =>
      action === "delete"
        ? prev.filter((p) => !ok.has(p.id))
        : prev.map((p) =>
            ok.has(p.id)
              ? { ...p, status: action === "publish" ? "active" : "draft" }
              : p,
          ),
    );
    setSelected(new Set());
    setBulkBusy(null);
    setConfirmBulkDelete(false);

    const verb =
      action === "publish"
        ? "published"
        : action === "unpublish"
          ? "unpublished"
          : "deleted";
    if (ok.size > 0)
      toast.success(`${ok.size} listing${ok.size === 1 ? "" : "s"} ${verb}`);
    if (failed > 0)
      toast.error(
        `${failed} listing${failed === 1 ? "" : "s"} couldn't be ${verb}`,
      );
    if (targets.length === 0)
      toast.info(`Nothing to ${action} in the selection`);
  };

  // Icon-only row actions; each has a tooltip and its own accessible name.
  const renderActions = (product: ProductWithMedia) => {
    const live = product.status === "active";
    return (
      <div className="flex items-center justify-end gap-1">
        {product.status !== "suspended" && (
          <Tooltip label={live ? "Unpublish" : "Publish"}>
            <IconButton
              label={`${live ? "Unpublish" : "Publish"} ${product.name}`}
              variant="ghost"
              size="sm"
              isLoading={togglingId === product.id}
              onClick={() => handleTogglePublished(product)}
            >
              <Icon name={live ? "eye-off" : "eye"} size={16} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip label="Edit">
          <Link
            href={`/seller/products/${product.id}/edit`}
            aria-label={`Edit ${product.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Icon name="edit" size={16} />
          </Link>
        </Tooltip>
        <Tooltip label="Delete">
          <IconButton
            label={`Delete ${product.name}`}
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
            onClick={() => setConfirmDelete(product)}
          >
            <Icon name="trash" size={16} />
          </IconButton>
        </Tooltip>
      </div>
    );
  };

  const thumb = (product: ProductWithMedia, size: string) => {
    const img = product.images.find((i) => i.isPrimary) ?? product.images[0];
    return (
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800",
          size,
        )}
      >
        {img ? (
          <SafeImage
            src={img.url}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
            <Icon name="image" size={16} />
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description={
          loading
            ? "Loading…"
            : `${products.length}${list.hasMore ? "+" : ""} listing${products.length !== 1 || list.hasMore ? "s" : ""}`
        }
        actions={
          <ButtonLink href="/seller/products/new">
            <Icon name="plus" />
            New listing
          </ButtonLink>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load your listings"
          message={error}
          onRetry={fetchProducts}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No listings yet"
          description="Create your first listing and start selling"
          action={
            <ButtonLink href="/seller/products/new">
              <Icon name="plus" />
              Create a listing
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Bulk action bar — appears once something is selected. */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors",
              selected.size > 0
                ? "border-brand-600/40 bg-brand-600/[0.06]"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
            )}
            role="toolbar"
            aria-label="Bulk actions"
          >
            <Checkbox
              label={
                selected.size > 0 ? `${selected.size} selected` : "Select all"
              }
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleAll}
            />
            {selected.size > 0 && (
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={bulkBusy === "publish"}
                  disabled={bulkBusy !== null}
                  onClick={() => runBulk("publish")}
                >
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={bulkBusy === "unpublish"}
                  disabled={bulkBusy !== null}
                  onClick={() => runBulk("unpublish")}
                >
                  Unpublish
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={bulkBusy !== null}
                  onClick={() => setConfirmBulkDelete(true)}
                >
                  <Icon name="trash" size={14} />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Table — md and up */}
          <div
            className={cardClasses({
              padded: false,
              className: "hidden overflow-x-auto md:block",
            })}
          >
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th scope="col" className="w-12 py-3 pl-5 pr-2">
                    <span className="sr-only">Select</span>
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Stock
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Sold
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {products.map((product) => {
                  const stock = totalStock(product);
                  const isSelected = selected.has(product.id);
                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        "transition-colors",
                        isSelected
                          ? "bg-brand-600/[0.04]"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
                      )}
                    >
                      <td className="py-3 pl-5 pr-2">
                        <Checkbox
                          label={`Select ${product.name}`}
                          hideLabel
                          checked={isSelected}
                          disabled={product.status === "suspended"}
                          onChange={() => toggle(product.id)}
                        />
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        <div className="flex items-center gap-3">
                          {thumb(product, "h-11 w-11")}
                          <div className="min-w-0">
                            <Link
                              href={`/products/${product.slug}`}
                              className="block truncate rounded font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                            >
                              {product.name}
                            </Link>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {product.variants.length} variant
                              {product.variants.length !== 1 ? "s" : ""}
                              {product.variants[0] && (
                                <>
                                  {" · "}
                                  <span className="font-mono">
                                    {product.variants[0].sku}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ProductStatusBadge status={product.status} />
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-3 font-mono text-zinc-800 dark:text-zinc-200">
                        {priceRange(product)}
                      </td>
                      <td
                        className={cn(
                          "tabular px-4 py-3 text-right font-mono",
                          stock === 0
                            ? "text-red-600 dark:text-red-400"
                            : stock <= 5
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-zinc-800 dark:text-zinc-200",
                        )}
                      >
                        {stock}
                      </td>
                      <td className="tabular px-4 py-3 text-right font-mono text-zinc-800 dark:text-zinc-200">
                        {product.unitsSold}
                      </td>
                      <td className="px-4 py-3">{renderActions(product)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <ul className="space-y-3 md:hidden">
            {products.map((product) => (
              <li
                key={product.id}
                className={cardClasses({ className: "p-4" })}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    label={`Select ${product.name}`}
                    hideLabel
                    checked={selected.has(product.id)}
                    disabled={product.status === "suspended"}
                    onChange={() => toggle(product.id)}
                    className="mt-3"
                  />
                  {thumb(product, "h-14 w-14")}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {product.name}
                      </p>
                      <ProductStatusBadge status={product.status} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="tabular font-mono text-zinc-800 dark:text-zinc-200">
                        {priceRange(product)}
                      </span>
                      {" · "}
                      {totalStock(product)} in stock · {product.unitsSold} sold
                    </p>
                  </div>
                </div>
                <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {renderActions(product)}
                </div>
              </li>
            ))}
          </ul>
          <LoadMore
            hasMore={list.hasMore}
            loading={list.loadingMore}
            onLoadMore={list.loadMore}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete listing"
        message={
          <>
            Delete{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {confirmDelete?.name}
            </span>
            ? This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        loading={deletingId !== null}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selected.size} listing${selected.size === 1 ? "" : "s"}`}
        message="The selected listings will be removed from your store. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={bulkBusy === "delete"}
        onConfirm={() => runBulk("delete")}
        onClose={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}
