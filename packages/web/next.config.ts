import type { NextConfig } from "next";

const API_URL = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    // Hosts next/image may optimize. Images from any other host still render
    // (SafeImage marks them unoptimized) — add a host here to optimize it.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "*.supabase.co" },
      // Local Supabase Storage (uploaded product photos in development).
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
      { protocol: "http", hostname: "localhost", port: "54321" },
      // Seeded demo catalogue (db-operations seed:catalogue).
      { protocol: "https", hostname: "cdn.dummyjson.com" },
      {
        protocol: API_URL.protocol.replace(":", "") as "http" | "https",
        hostname: API_URL.hostname,
        port: API_URL.port,
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Static security headers for every response. The Content-Security-Policy
  // depends on the environment, so it's set in src/middleware.ts.
  // With NEXT_PUBLIC_API_PROXY=1, /api/* on this site is forwarded to the
  // API, so the browser only ever talks to one site and the sign-in cookie
  // is first-party (see src/lib/env.ts).
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_PROXY !== "1") return [];
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL.origin}/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No embedding in frames — blocks clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
