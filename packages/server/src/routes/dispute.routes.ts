import Elysia, { t } from "elysia";
import { authPlugin, adminPlugin } from "../middleware/auth.middleware";
import {
  raiseDispute,
  getBuyerDisputes,
  getDisputesByOrder,
  getAllDisputesByStatus,
  reviewDispute,
  resolveDispute,
  closeDispute,
} from "../services/dispute.service";

export const disputeRoutes = new Elysia({ prefix: "/disputes" })

  // ─────────────────────────────────────────
  // Buyer
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(authPlugin)

      // Get all disputes raised by the current buyer.
      .get("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getBuyerDisputes(userId);
        return { success: true, data: result };
      })

      // Get all disputes for a specific order.
      .get("/order/:orderId", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await getDisputesByOrder(userId, params.orderId);

        if (result === "order_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Order not found." };
        }

        return { success: true, data: result };
      })

      // Raise a dispute against an order.
      .post(
        "/",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await raiseDispute(userId, body);

          if (result === "order_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Order not found." };
          }

          if (result === "order_not_disputable") {
            ctx.set.status = 400;
            return {
              success: false,
              message: "This order cannot be disputed at its current status.",
            };
          }

          ctx.set.status = 201;
          return { success: true, message: "Dispute raised successfully." };
        },
        {
          body: t.Object({
            orderId: t.String(),
            reason: t.String({ minLength: 5 }),
            description: t.Optional(t.String()),
          }),
        },
      ),
  )

  // ─────────────────────────────────────────
  // Admin
  // ─────────────────────────────────────────

  .group("/admin", (app) =>
    app
      .use(adminPlugin())

      // Get all disputes filtered by status.
      // Use this for admin dispute pipeline views.
      .get("/status/:status", async (ctx) => {
        const { params } = ctx as any;
        const result = await getAllDisputesByStatus(params.status);
        return { success: true, data: result };
      })

      // Move a dispute to under_review — signals admin is investigating.
      .patch("/:disputeId/review", async (ctx) => {
        const { params } = ctx as any;
        const result = await reviewDispute(params.disputeId);

        if (result === "dispute_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Dispute not found." };
        }

        return { success: true, message: "Dispute is now under review." };
      })

      // Resolve a dispute with a resolution note.
      // Automatically closes the dispute after resolution.
      .patch(
        "/:disputeId/resolve",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await resolveDispute(
            params.disputeId,
            body.resolution,
          );

          if (result === "dispute_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Dispute not found." };
          }

          return { success: true, message: "Dispute resolved successfully." };
        },
        {
          body: t.Object({
            resolution: t.String({ minLength: 10 }),
          }),
        },
      )

      // Manually close a dispute without a resolution.
      // Use this for disputes that become invalid or are withdrawn.
      .patch("/:disputeId/close", async (ctx) => {
        const { params } = ctx as any;
        const result = await closeDispute(params.disputeId);

        if (result === "dispute_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Dispute not found." };
        }

        return { success: true, message: "Dispute closed successfully." };
      }),
  );
