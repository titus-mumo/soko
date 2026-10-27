import Elysia from "elysia";
import {
  VerifySeller,
  UpdateSellerRating,
  AdminDeleteSellerProfile,
} from "./adminSellers";

export const sellerRoutes = new Elysia().group("/sellers", (app) =>
  app
    // Admin only: stores can no longer be created or self-managed — Soko
    // runs the catalogue (see routes/product).
    .use(VerifySeller)
    .use(UpdateSellerRating)
    .use(AdminDeleteSellerProfile)
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
