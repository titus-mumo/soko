import Elysia from "elysia";
import { getSellerProfileBySlug } from "../../services/seller.service";

export const GetSellerBySlug = new Elysia().get("/:slug", async (ctx) => {
  const { params, set } = ctx as any;
  const result = await getSellerProfileBySlug(params.slug);

  if (result === "seller_not_found") {
    set.status = 404;
    return { success: false, message: "Seller not found." };
  }

  return { success: true, data: result };
});
