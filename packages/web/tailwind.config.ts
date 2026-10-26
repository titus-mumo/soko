import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Soko type scale. Line heights favour reading for body sizes and
    // tightness for display sizes.
    fontSize: {
      "2xs": ["10px", { lineHeight: "14px" }],
      xs: ["11px", { lineHeight: "16px" }],
      sm: ["13px", { lineHeight: "20px" }],
      base: ["15px", { lineHeight: "24px" }],
      lg: ["17px", { lineHeight: "26px" }],
      xl: ["20px", { lineHeight: "28px" }],
      "2xl": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
      "3xl": ["30px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
      "4xl": ["36px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
      "5xl": ["48px", { lineHeight: "52px", letterSpacing: "-0.03em" }],
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: [
          "var(--font-geist)",
          "var(--font-inter)",
          "ui-sans-serif",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      colors: {
        // The one accent. Use for primary CTAs, active state, prices, key
        // metrics — sparingly.
        brand: colors.green,
      },
      boxShadow: {
        // 1px top highlight that gives dark cards a lit edge.
        highlight: "inset 0 1px 0 0 rgb(255 255 255 / 0.05)",
      },
      maxWidth: {
        content: "1200px",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        progress: {
          "0%": { transform: "scaleX(1)" },
          "100%": { transform: "scaleX(0)" },
        },
        ring: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(-12deg)" },
          "30%": { transform: "rotate(10deg)" },
          "45%": { transform: "rotate(-8deg)" },
          "60%": { transform: "rotate(6deg)" },
          "75%": { transform: "rotate(-3deg)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        pop: "pop 300ms ease-out",
        "toast-in": "toast-in 200ms ease-out",
        "modal-in": "modal-in 150ms ease-out",
        "fade-in": "fade-in 150ms ease",
        "slide-in-left": "slide-in-left 200ms ease-out",
        progress: "progress linear forwards",
        ring: "ring 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
