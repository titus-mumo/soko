import type { Metadata } from "next";

export const SITE_NAME = "Soko";
export const SITE_DESCRIPTION =
  "Soko is Kenya's marketplace — shop electronics, fashion and home goods and pay with M-Pesa.";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/** "/products/x" → "https://soko.example/products/x" */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageMetadataInput {
  title: string;
  description?: string;
  /** Route path, used for the canonical URL and og:url. */
  path: string;
  /** Absolute or root-relative image for social cards. */
  image?: string | null;
  /** Account and admin pages shouldn't be indexed. */
  noIndex?: boolean;
  type?: "website" | "article";
}

/** Builds consistent title/description/canonical/OG/Twitter metadata. */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  image,
  noIndex = false,
  type = "website",
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const images = image ? [{ url: image, alt: title }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      locale: "en_KE",
      ...(images && { images }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} | ${SITE_NAME}`,
      description,
      ...(image && { images: [image] }),
    },
    ...(noIndex && { robots: { index: false, follow: false } }),
  };
}

/** Trims text to a meta-description-friendly length on a word boundary. */
export function summarize(text: string | null | undefined, max = 155) {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", max - 1))}…`;
}
