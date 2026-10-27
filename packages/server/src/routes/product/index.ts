import Elysia from "elysia";
import {
  BrowseProducts,
  GetCatalogueStats,
  GetProductBySlug,
  GetProductsByCategory,
  GetProductVariants,
  GetProductImages,
  GetProductTags,
  GetManagedProducts,
  GetCatalogueCounts,
  GetManagedProduct,
  GetVariantDetails,
} from "./getProducts";
import { CreateProduct } from "./createProduct";
import {
  UpdateProduct,
  PublishProduct,
  UnpublishProduct,
} from "./updateProduct";
import { DeleteProduct } from "./deleteProduct";
import {
  AddVariant,
  UpdateVariant,
  AdjustVariantStock,
  DeleteVariant,
} from "./productVariants";
import {
  AddProductImage,
  SetPrimaryImage,
  DeleteProductImage,
} from "./productImages";
import { ReplaceProductTags } from "./productTags";

export const productRoutes = new Elysia().group("/products", (app) =>
  app
    // Public
    .use(BrowseProducts)
    .use(GetCatalogueStats)
    .use(GetProductBySlug)
    .use(GetProductsByCategory)
    .use(GetProductVariants)
    .use(GetProductImages)
    .use(GetProductTags)
    .use(GetVariantDetails)
    // Admin — catalogue management (Soko lists everything itself)
    .use(GetManagedProducts)
    .use(GetCatalogueCounts)
    .use(GetManagedProduct)
    .use(CreateProduct)
    .use(UpdateProduct)
    .use(PublishProduct)
    .use(UnpublishProduct)
    .use(DeleteProduct)
    // Admin — variants
    .use(AddVariant)
    .use(UpdateVariant)
    .use(AdjustVariantStock)
    .use(DeleteVariant)
    // Admin — images
    .use(AddProductImage)
    .use(SetPrimaryImage)
    .use(DeleteProductImage)
    // Admin — tags
    .use(ReplaceProductTags)
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
