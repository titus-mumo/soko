import Image, { type ImageProps } from "next/image";

// Hosts listed in next.config.ts `images.remotePatterns`. Seller-supplied
// URLs can point anywhere; those still render, just without optimization,
// so an unknown host never breaks the page.
const OPTIMIZED_HOSTS = [
  /^picsum\.photos$/,
  /^fastly\.picsum\.photos$/,
  /\.supabase\.co$/,
  /^cdn\.dummyjson\.com$/,
  /^localhost$/,
  /^127\.0\.0\.1$/,
];

function isOptimizable(src: string): boolean {
  // This site's own files (e.g. the home page's saved photos in public/).
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const { hostname } = new URL(src);
    return OPTIMIZED_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false; // relative or malformed — let the browser handle it
  }
}

type SafeImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  /** Required and must describe the image — never empty for content images. */
  alt: string;
};

/** next/image for user-supplied URLs. */
export function SafeImage({ src, alt, ...props }: SafeImageProps) {
  return (
    <Image src={src} alt={alt} unoptimized={!isOptimizable(src)} {...props} />
  );
}
