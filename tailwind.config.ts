import type { Config } from "tailwindcss";

// Design-Tokens: exakt aus dem Republic-of-Pixels-Logo per Pixel-Sampling extrahiert
// (Navy #0F0D2C, Cyan #02F0D1) und daraus mathematisch abgeleitet — siehe docs/konzept.md Abschnitt 3.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0F0D2C",
          elevated: "#141230",
        },
        surface: {
          card: "#171533",
          hover: "#1B1937",
        },
        border: {
          subtle: "#201E3B",
          default: "#292843",
          strong: "#3A3952",
        },
        accent: {
          DEFAULT: "#02F0D1",
          hover: "#30F3D9",
          active: "#02C5AB",
          wash: "#0D3146",
        },
        text: {
          primary: "#F1F0F2",
          secondary: "#ADADB7",
          tertiary: "#7D7C8D",
          disabled: "#525167",
        },
        success: "#2ED47A",
        warning: "#F5B942",
        error: "#F1544B",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "var(--font-inter)",
          "Inter",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        article: "44rem",
        content: "80rem",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
        elevated: "0 20px 60px -20px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
