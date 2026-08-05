import type { Config } from "tailwindcss";

// Design-Tokens, Dark-First (Betreiber-Entscheidung 05.08.2026): Die Seite ist
// grundsätzlich dunkel — sehr tiefes Navy-Schwarz als Basis (dunkler als das
// Logo-Navy, damit es nicht "navy-lastig" wirkt), das Logo-Navy #0F0D2C als
// Band für Header/Hero, Cyan #02F0D1 in voller Leuchtkraft als Akzent (auf
// dunklem Grund voll AA-lesbar). Herleitung der Originalwerte: docs/konzept.md §3.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0B0A1E",
          elevated: "#100E26",
        },
        surface: {
          card: "#151330",
          hover: "#1A1838",
        },
        border: {
          subtle: "#201E3E",
          default: "#2A2850",
          strong: "#3C3A68",
        },
        accent: {
          DEFAULT: "#02F0D1",
          hover: "#30F3D9",
          active: "#02C5AB",
          wash: "#0C3A43",
          brand: "#02F0D1",
        },
        text: {
          primary: "#F1F0F2",
          secondary: "#A9A9C0",
          tertiary: "#7D7C99",
          disabled: "#52516B",
        },
        success: "#2ED47A",
        warning: "#F5B942",
        error: "#F1544B",
        // Marken-Navy-Band (Header/Hero/Footer) — minimal heller als bg.base,
        // damit die Zonen sich subtil absetzen.
        navy: {
          DEFAULT: "#0F0D2C",
          raised: "#171533",
          border: "#26244A",
          text: "#F1F0F2",
          muted: "#A9A9C0",
          dim: "#7D7C99",
        },
      },
      fontFamily: {
        // EINE Schrift überall (Betreiber-Vorgabe 05.08.2026, revidiert):
        // Inter für alles — Headlines wie Fliesstext, keine zweite Familie.
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        display: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      maxWidth: {
        article: "44rem",
        content: "80rem",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
        elevated: "0 24px 60px -20px rgba(0,0,0,0.6)",
        // Cyan-Glow für Hover-Zustände — Gaming-Energie, dezent dosiert.
        glow: "0 0 0 1px rgba(2,240,209,0.35), 0 10px 34px -10px rgba(2,240,209,0.35)",
        glowdark: "0 0 0 1px rgba(2,240,209,0.4), 0 14px 44px -12px rgba(2,240,209,0.28)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.8)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
