import type { Config } from "tailwindcss";

// Design-Tokens, Light-Theme (Betreiber-Entscheidung 04.08.2026): Die Markenfarben
// aus dem Logo (Navy #0F0D2C, Cyan #02F0D1) bleiben die Basis — Navy wird zur
// Text-/Kontrastfarbe, Cyan bleibt Markenakzent (als Interaktionsfarbe abgedunkelt,
// damit Links auf Weiss AA-Kontrast erreichen). Ursprüngliche Dark-Tokens: docs/konzept.md §3.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#F7F8FA",
          elevated: "#FFFFFF",
        },
        surface: {
          card: "#FFFFFF",
          hover: "#F1F3F7",
        },
        border: {
          subtle: "#E9EBF1",
          default: "#DADDE6",
          strong: "#B8BDCC",
        },
        accent: {
          DEFAULT: "#00806E",
          hover: "#02A78F",
          active: "#006658",
          wash: "#E2FAF5",
          brand: "#02F0D1",
        },
        text: {
          primary: "#0F0D2C",
          secondary: "#4A4A61",
          tertiary: "#75758A",
          disabled: "#A9A9B8",
        },
        success: "#1D9E5C",
        warning: "#A97400",
        error: "#D23F37",
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
        card: "0 1px 2px rgba(15,13,44,0.05), 0 8px 24px -12px rgba(15,13,44,0.12)",
        elevated: "0 24px 60px -24px rgba(15,13,44,0.25)",
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
