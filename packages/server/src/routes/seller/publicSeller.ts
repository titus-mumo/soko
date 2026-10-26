import Elysia from "elysia";
import { getPublicSellerById } from "../../services/seller.service";

// Products reference sellers by profile id; this returns the anonymous trust
// summary (verified, rating, sales) shown on product pages. Store names and
// storefronts aren't public — buyers deal with Soko.
export const GetSellerById = new Elysia().get(
  "/by-id/:sellerId",
  async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getPublicSellerById(params.sellerId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller not found." };
    }

    return { success: true, data: result };
  },
);
