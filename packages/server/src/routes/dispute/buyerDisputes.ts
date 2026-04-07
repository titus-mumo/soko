import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import {
  getBuyerDisputes,
  getDisputesByOrder,
  raiseDispute,
} from "../../services/dispute.service";

export const GetBuyerDisputes = new Elysia()
  .use(authPlugin)
  .get("/me", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getBuyerDisputes(userId);
    return { success: true, data: result };
  });

export const GetDisputesByOrder = new Elysia()
  .use(authPlugin)
  .get("/me/order/:orderId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await getDisputesByOrder(userId, params.orderId);

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }

    return { success: true, data: result };
  });

export const RaiseDispute = new Elysia().use(authPlugin).post(
  "/me",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await raiseDispute(userId, body);

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }
    if (result === "order_not_disputable") {
      set.status = 400;
      return {
        success: false,
        message: "This order cannot be disputed at its current status.",
      };
    }

    set.status = 201;
    return { success: true, message: "Dispute raised successfully." };
  },
  {
    body: t.Object({
      orderId: t.String(),
      reason: t.String({ minLength: 5 }),
      description: t.Optional(t.String()),
    }),
  },
);
