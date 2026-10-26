import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import { replaceProductTags } from "../../services/product.service";
import { CONTACT_INFO_MESSAGE } from "../../lib/contact-filter";

export const ReplaceProductTags = new Elysia().use(sellerPlugin).put(
  "/:productId/tags",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await replaceProductTags(
      userId,
      params.productId,
      body.tags,
    );

    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }
    if (result === "contact_info") {
      set.status = 400;
      return { success: false, message: CONTACT_INFO_MESSAGE };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      tags: t.Array(t.String()),
    }),
  },
);
