import Elysia from "elysia";
import {
  GetBuyerDisputes,
  GetDisputesByOrder,
  RaiseDispute,
} from "./buyerDisputes";
import {
  GetAllDisputesByStatus,
  ReviewDispute,
  ResolveDispute,
  CloseDispute,
} from "./adminDisputes";

export const disputeRoutes = new Elysia().group("/disputes", (app) =>
  app
    // Buyer
    .use(GetBuyerDisputes)
    .use(GetDisputesByOrder)
    .use(RaiseDispute)
    // Admin
    .use(GetAllDisputesByStatus)
    .use(ReviewDispute)
    .use(ResolveDispute)
    .use(CloseDispute)
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return { success: false, message: error.message };
      }
      if (code === "INTERNAL_SERVER_ERROR") {
        set.status = 500;
        return { success: false, message: "Internal server error." };
      }
    }),
);
