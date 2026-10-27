import { ImageResponse } from "next/og";
import { BasketMark } from "@/components/seo/BasketMark";

// The home-screen icon for iPhone/iPad (PNG; Safari ignores SVG icons).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#16a34a",
      }}
    >
      <BasketMark size={112} />
    </div>,
    size,
  );
}
