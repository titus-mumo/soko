import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  getAllDisputesByStatus,
  reviewDispute,
  resolveDispute,
  closeDispute,
} from "../../services/dispute.service";

export const GetAllDisputesByStatus = new Elysia()
  .use(adminPlugin)
  .get("/admin/status/:status", async (ctx) => {
    const { params } = ctx as any;
    const result = await getAllDisputesByStatus(params.status);
    return { success: true, data: result };
  });

export const ReviewDispute = new Elysia()
  .use(adminPlugin)
  .patch("/admin/:disputeId/review", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await reviewDispute(params.disputeId);

    if (result === "dispute_not_found") {
      set.status = 404;
      return { success: false, message: "Dispute not found." };
    }

    return { success: true, message: "Dispute is now under review." };
  });

export const ResolveDispute = new Elysia().use(adminPlugin).patch(
  "/admin/:disputeId/resolve",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await resolveDispute(params.disputeId, body.resolution);

    if (result === "dispute_not_found") {
      set.status = 404;
      return { success: false, message: "Dispute not found." };
    }

    return { success: true, message: "Dispute resolved successfully." };
  },
  {
    body: t.Object({
      resolution: t.String({ minLength: 10 }),
    }),
  },
);

export const CloseDispute = new Elysia()
  .use(adminPlugin)
  .patch("/admin/:disputeId/close", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await closeDispute(params.disputeId);

    if (result === "dispute_not_found") {
      set.status = 404;
      return { success: false, message: "Dispute not found." };
    }

    return { success: true, message: "Dispute closed successfully." };
  });
