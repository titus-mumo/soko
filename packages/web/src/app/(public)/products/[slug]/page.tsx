import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchProductPage } from "@/lib/server-api";
import { pageMetadata, summarize } from "@/lib/seo";
import { formatKES } from "@/lib/utils";
import {
  JsonLd,
  breadcrumbJsonLd,
  productJsonLd,
} from "@/components/seo/JsonLd";
import ProductDetailView from "./view";

// generateMetadata and the page share one fetch per request.
const getProduct = cache(fetchProductPage);

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProduct(slug);
  // Resolve 404s here: metadata runs before the response starts streaming,
  // so this keeps a real 404 status instead of a soft 200.
  if (!data) notFound();

  const { product, variants, images, category } = data;
  const from = variants.length
    ? Math.min(...variants.map((v) => Number(v.price)))
    : null;
  const fallback = `${product.name}${category ? ` in ${category.name}` : ""}${
    from !== null ? ` from ${formatKES(from)}` : ""
  }. Buy on Soko and pay with M-Pesa.`;

  return pageMetadata({
    title: product.name,
    description: summarize(product.description) ?? fallback,
    path: `/products/${product.slug}`,
    image: images[0]?.url,
  });
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) notFound();

  const { product, variants, images, category, rating } = data;

  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: product.name,
          slug: product.slug,
          description: product.description,
          condition: product.condition,
          images,
          variants,
          category,
          rating,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          ["Products", "/products"],
          ...(category
            ? [
                [category.name, `/categories/${category.slug}`] as [
                  string,
                  string,
                ],
              ]
            : []),
          [product.name, `/products/${product.slug}`],
        ])}
      />
      <ProductDetailView data={data} />
    </>
  );
}
