import { getRepositories } from "../lib/repositories";
import type { PageParams } from "db-operations";

const { disputeRepository, orderRepository, notificationRepository } =
  getRepositories();

// ─────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────

// Only allows a dispute if the order exists and belongs to the buyer.
// A buyer can raise multiple disputes against the same order for
// different reasons e.g. wrong item, damaged goods.
export async function raiseDispute(
  userId: string,
  data: {
    orderId: string;
    reason: string;
    description?: string;
  },
): Promise<"order_not_found" | "order_not_disputable" | "dispute_raised"> {
  const order = await orderRepository.findOrderByIdAndBuyerId(
    data.orderId,
    userId,
  );

  if (order === "order_not_found") return "order_not_found";

  // Only confirmed, processing, shipped, or delivered orders can be disputed.
  // Pending, cancelled, and refunded orders are not disputable.
  const disputableStatuses = [
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];
  if (!disputableStatuses.includes(order.status)) return "order_not_disputable";

  const dispute = await disputeRepository.insertDispute({
    orderId: data.orderId,
    raisedBy: userId,
    reason: data.reason,
    description: data.description,
    status: "open",
  });

  if (!dispute) throw new Error("Failed to create dispute");

  // Notify admins of the new dispute via a platform notification.
  // In production replace this with a dedicated admin alert system.
  await notificationRepository.insertNotification({
    userId,
    type: "dispute_raised",
    title: "Dispute Raised",
    body: `Your dispute for order #${data.orderId.slice(0, 8)} has been submitted and is under review.`,
    channel: "push",
  });

  return "dispute_raised";
}

export async function getBuyerDisputes(userId: string, page?: PageParams) {
  return await disputeRepository.pageDisputes({ raisedBy: userId }, page);
}

export async function getDisputesByOrder(
  userId: string,
  orderId: string,
): Promise<
  | "order_not_found"
  | Awaited<ReturnType<typeof disputeRepository.findDisputesByOrderId>>
> {
  // Scope to the buyer to prevent accessing another user's disputes.
  const order = await orderRepository.findOrderByIdAndBuyerId(orderId, userId);
  if (order === "order_not_found") return "order_not_found";

  return await disputeRepository.findDisputesByOrderId(orderId);
}

// ─────────────────────────────────────────
// Admin
// ─────────────────────────────────────────

export async function getAllDisputesByStatus(
  status: "open" | "under_review" | "resolved" | "closed",
  page?: PageParams,
) {
  return await disputeRepository.pageDisputes({ status }, page);
}

// Moves a dispute from open to under_review to signal admin is investigating.
export async function reviewDispute(
  disputeId: string,
): Promise<"dispute_not_found" | "dispute_under_review"> {
  const result = await disputeRepository.updateDisputeStatus(
    disputeId,
    "under_review",
  );

  if (result === "dispute_not_found") return "dispute_not_found";

  // Notify the buyer that their dispute is being reviewed.
  await notificationRepository.insertNotification({
    userId: (result as any).raisedBy,
    type: "dispute_update",
    title: "Dispute Update",
    body: `Your dispute #${disputeId.slice(0, 8)} is now under review.`,
    channel: "push",
  });

  return "dispute_under_review";
}

export async function resolveDispute(
  disputeId: string,
  resolution: string,
): Promise<"dispute_not_found" | "dispute_resolved"> {
  const result = await disputeRepository.resolveDispute(disputeId, resolution);

  if (result === "dispute_not_found") return "dispute_not_found";

  // Notify the buyer of the resolution outcome.
  await notificationRepository.insertNotification({
    userId: (result as any).raisedBy,
    type: "dispute_resolved",
    title: "Dispute Resolved",
    body: `Your dispute #${disputeId.slice(0, 8)} has been resolved. ${resolution}`,
    channel: "push",
  });

  // Automatically close the dispute after resolution.
  await disputeRepository.closeDispute(disputeId);

  return "dispute_resolved";
}

export async function closeDispute(
  disputeId: string,
): Promise<"dispute_not_found" | "dispute_closed"> {
  const result = await disputeRepository.closeDispute(disputeId);
  if (result === "dispute_not_found") return "dispute_not_found";

  await notificationRepository.insertNotification({
    userId: (result as any).raisedBy,
    type: "dispute_closed",
    title: "Dispute Closed",
    body: `Your dispute #${disputeId.slice(0, 8)} has been closed.`,
    channel: "push",
  });

  return "dispute_closed";
}
