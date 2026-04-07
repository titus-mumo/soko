import Elysia from "elysia";
import {
  getProductReviews,
  getSellerReviews,
  getAverageProductRating,
  getAverageSellerRating,
  getBuyerReviews,
} from "../../services/review.service";
import { authPlugin } from "../../middleware/auth.middleware";

// Public
export const GetProductReviews = new Elysia().get(
  "/product/:productId",
  async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductReviews(params.productId);
    return { success: true, data: result };
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

export const GetSellerReviews = new Elysia().get(
  "/seller/:sellerId",
  async (ctx) => {
    const { params } = ctx as any;
    const result = await getSellerReviews(params.sellerId);
    return { success: true, data: result };
  },
);

export const GetAverageSellerRating = new Elysia().get(
  "/seller/:sellerId/rating",
  async (ctx) => {
    const { params } = ctx as any;
    const result = await getAverageSellerRating(params.sellerId);
    return { success: true, data: { averageRating: result } };
  },
);

// Buyer
export const GetBuyerReviews = new Elysia()
  .use(authPlugin)
  .get("/me", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getBuyerReviews(userId);
    return { success: true, data: result };
  });
