import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import { replaceProductTags } from "../../services/product.service";

export const ReplaceProductTags = new Elysia().use(sellerPlugin).put(
  "/:productId/tags",
  async (ctx) => {
    const { params, body } = ctx as any;
    const result = await replaceProductTags(params.productId, body.tags);
    return { success: true, data: result };
  },
  {
    body: t.Object({
      tags: t.Array(t.String()),
    }),
  },
);
