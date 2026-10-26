import Elysia from "elysia";
import {
  GetProductReviews,
  GetAverageProductRating,
  GetBuyerReviews,
} from "./getReviews";
import { CreateReview } from "./createReview";
import { UpdateReviewComment } from "./updateReview";
import { DeleteReview, AdminDeleteReview } from "./deleteReview";

export const reviewRoutes = new Elysia().group("/reviews", (app) =>
  app
    // Public
    .use(GetProductReviews)
    .use(GetAverageProductRating)
    // Buyer
    .use(GetBuyerReviews)
    .use(CreateReview)
    .use(UpdateReviewComment)
    .use(DeleteReview)
    // Admin
    .use(AdminDeleteReview)
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
