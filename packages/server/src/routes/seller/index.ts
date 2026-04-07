import Elysia from "elysia";
import { GetSellerBySlug } from "./publicSeller";
import { OnboardSeller } from "./onboardSeller";
import {
  GetSellerProfile,
  UpdateSellerProfile,
  UploadVerificationDoc,
  DeleteSellerProfile,
} from "./sellerProfile";
import {
  VerifySeller,
  UpdateSellerRating,
  AdminDeleteSellerProfile,
} from "./adminSellers";

export const sellerRoutes = new Elysia().group("/sellers", (app) =>
  app
    // Public
    .use(GetSellerBySlug)
    // Onboarding
    .use(OnboardSeller)
    // Seller profile management
    .use(GetSellerProfile)
    .use(UpdateSellerProfile)
    .use(UploadVerificationDoc)
    .use(DeleteSellerProfile)
    // Admin
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
