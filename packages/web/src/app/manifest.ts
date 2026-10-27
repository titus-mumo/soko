import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

// Lets phones add Soko to the home screen with its own name, icon and colours.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Kenya's marketplace`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#16a34a",
    lang: "en-KE",
    categories: ["shopping"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
