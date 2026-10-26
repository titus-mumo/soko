import Elysia from "elysia";
import { pageParams, paged } from "../../lib/paging";
import {
  getProductReviews,
  getAverageProductRating,
  getBuyerReviews,
} from "../../services/review.service";
import { authPlugin } from "../../middleware/auth.middleware";
import { ownReview, publicReview } from "../../lib/views";

// Public
export const GetProductReviews = new Elysia().get(
  "/product/:productId",
  async (ctx) => {
    const { params, query } = ctx as any;
    return paged(
      await getProductReviews(params.productId, pageParams(query)),
      publicReview,
    );
  },
);

export const GetAverageProductRating = new Elysia().get(
  "/product/:productId/rating",
  async (ctx) => {
    const { params } = ctx as any;
    const result = await getAverageProductRating(params.productId);
    return { success: true, data: { averageRating: result } };
  },
);

// Buyer
export const GetBuyerReviews = new Elysia()
  .use(authPlugin)
  .get("/me", async (ctx) => {
    const { userId, query } = ctx as any;
    return paged(await getBuyerReviews(userId, pageParams(query)), ownReview);
  });
