"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMyReviews,
  updateReviewComment,
  deleteReview,
  createReview,
} from "@/lib/reviews.api";
import { getBuyerOrders, getBuyerOrderById } from "@/lib/orders.api";
import { getVariantDetailsMap } from "@/lib/products.api";
import { toast } from "@/store/toast.store";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormError } from "@/components/ui/FormError";
import { PageHeader } from "@/components/ui/PageHeader";
import { StarPicker, Stars } from "@/components/ui/Stars";
import { apiErrorMessage } from "@/lib/utils";
import { getAllPages } from "@/lib/paging";
import type { OrderItem, Review } from "@/lib/types";

interface ReviewableItem {
  orderItemId: string;
  name: string;
}

// ─── Write review modal ───────────────────────────────────────────────────────

function WriteReviewModal({
  item,
  onDone,
  onClose,
}: {
  item: ReviewableItem;
  onDone: () => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Choose a rating from 1 to 5 stars.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createReview({
        orderItemId: item.orderItemId,
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success("Thanks — your review is live");
      onDone();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to submit review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Review ${item.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <p
            aria-hidden="true"
            className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Rating
          </p>
          <StarPicker value={rating} onChange={setRating} label="Rating" />
        </div>
        <Textarea
          label="Comment (optional)"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like or dislike?"
        />
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Submit review
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit review modal ────────────────────────────────────────────────────────

function EditReviewModal({
  review,
  onDone,
  onClose,
}: {
  review: Review;
  onDone: () => void;
  onClose: () => void;
}) {
  const [comment, setComment] = useState(review.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Write a comment, or delete the review instead.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateReviewComment(review.id, comment.trim());
      toast.success("Review updated");
      onDone();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to update review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit review">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Stars rating={review.rating} />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Ratings can&apos;t be changed after posting.
          </p>
        </div>
        <Textarea
          label="Comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const REVIEWABLE_ORDERS = 20;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewableItems, setReviewableItems] = useState<ReviewableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Review | null>(null);
  const [writing, setWriting] = useState<ReviewableItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);
  // orderItemId → product name, for labelling reviews.
  const [itemNames, setItemNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Items are delivered with their order (one hub shipment), so only
      // delivered orders have anything to review — the most recent 20.
      const [myReviews, delivered] = await Promise.all([
        getAllPages(getMyReviews),
        getBuyerOrders({ limit: REVIEWABLE_ORDERS }, "delivered"),
      ]);
      setReviews(myReviews);

      // Order lists don't include items, so fetch each delivered order.
      const details = await Promise.all(
        delivered.items.map((o) => getBuyerOrderById(o.id).catch(() => null)),
      );
      const allItems: OrderItem[] = details.flatMap((d) =>
        d
          ? d.items.map((i) =>
              // An item counts as delivered if it or its order is.
              d.order.status === "delivered"
                ? { ...i, status: "delivered" as const }
                : i,
            )
          : [],
      );
      const variants = await getVariantDetailsMap(
        allItems.map((i) => i.productVariantId),
      );
      const names: Record<string, string> = {};
      for (const i of allItems) {
        names[i.id] =
          variants[i.productVariantId]?.product.name ??
          `Item ${i.id.slice(-4).toUpperCase()}`;
      }
      setItemNames(names);

      const reviewedItemIds = new Set(myReviews.map((r) => r.orderItemId));
      setReviewableItems(
        allItems
          .filter((i) => i.status === "delivered" && !reviewedItemIds.has(i.id))
          .map((i) => ({ orderItemId: i.id, name: names[i.id] })),
      );
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load your reviews"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteReview(confirmDelete.id);
      setReviews((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      toast.success("Review deleted");
      setConfirmDelete(null);
      load(); // the item becomes reviewable again
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete review"));
    } finally {
      setDeleting(false);
    }
  };

  const reviewName = (r: Review) =>
    (r.orderItemId && itemNames[r.orderItemId]) ||
    `Item ${(r.orderItemId ?? r.id).slice(-4).toUpperCase()}`;

  return (
    <div className="space-y-8">
      <PageHeader title="Reviews" description="Your product reviews" />

      {error ? (
        <ErrorState
          title="Couldn't load reviews"
          message={error}
          onRetry={load}
        />
      ) : (
        <>
          {!loading && reviewableItems.length > 0 && (
            <section aria-labelledby="awaiting-heading">
              <h2
                id="awaiting-heading"
                className="mb-3 text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                Awaiting your review
              </h2>
              <ul className="space-y-2">
                {reviewableItems.map((item) => (
                  <li
                    key={item.orderItemId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {item.name}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setWriting(item)}
                      aria-label={`Write a review for ${item.name}`}
                    >
                      Write review
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="your-reviews-heading">
            <h2
              id="your-reviews-heading"
              className="mb-3 text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Your reviews{!loading && ` (${reviews.length})`}
            </h2>

            {loading ? (
              <div className="space-y-3" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <EmptyState
                icon="star"
                title="You haven't reviewed anything yet"
                description={
                  reviewableItems.length > 0
                    ? "Delivered items you can review are listed above."
                    : "Once an order is delivered, you can review it here."
                }
                titleAs="h3"
                action={
                  reviewableItems.length === 0 ? (
                    <ButtonLink href="/orders" variant="secondary" size="sm">
                      View your orders
                    </ButtonLink>
                  ) : undefined
                }
              />
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {reviewName(r)}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          <Stars rating={r.rating} />
                          <time
                            dateTime={r.createdAt}
                            className="text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            {new Date(r.createdAt).toLocaleDateString("en-KE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </time>
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            {r.comment}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditing(r)}
                          aria-label={`Edit review of ${reviewName(r)}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(r)}
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                          aria-label={`Delete review of ${reviewName(r)}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {writing && (
        <WriteReviewModal
          item={writing}
          onDone={load}
          onClose={() => setWriting(null)}
        />
      )}
      {editing && (
        <EditReviewModal
          review={editing}
          onDone={load}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete review"
        message="Delete this review? You can write a new one afterwards."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
