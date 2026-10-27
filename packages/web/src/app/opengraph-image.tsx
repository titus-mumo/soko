import { ImageResponse } from "next/og";
import { BasketMark } from "@/components/seo/BasketMark";

// The default image when a Soko link is shared (WhatsApp, X, Facebook…).
// Product pages use their own product photo instead.
export const alt = "Soko — Kenya's marketplace. Pay with M-Pesa.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background:
          "linear-gradient(135deg, #052e16 0%, #14532d 55%, #16a34a 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <BasketMark size={60} />
        </div>
        <span style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>
          Soko
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -1.5,
            lineHeight: 1.1,
          }}
        >
          Kenya&apos;s marketplace
        </span>
        <span style={{ fontSize: 34, color: "#bbf7d0" }}>
          Electronics, fashion and home goods · Pay with M-Pesa · Delivered
          across Kenya
        </span>
      </div>
    </div>,
    size,
  );
}
