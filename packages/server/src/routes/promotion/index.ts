import Elysia from "elysia";
import { PreviewPromoCode } from "./publicPromotions";
import {
  GetPlatformPromotions,
  CreatePlatformPromotion,
  ActivatePromotion,
  DeactivatePromotion,
  DeletePromotion,
} from "./adminPromotions";

export const promotionRoutes = new Elysia().group("/promotions", (app) =>
  app
    // Public
    .use(PreviewPromoCode)
    // Admin
    .use(GetPlatformPromotions)
    .use(CreatePlatformPromotion)
    .use(ActivatePromotion)
    .use(DeactivatePromotion)
    .use(DeletePromotion)
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
