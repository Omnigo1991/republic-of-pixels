import type { Config } from "tailwindcss";

// Design-Tokens "Logo-Navy" (Betreiber-Entscheidung 07.08.2026): sehr
// dunkles Navy, abgeleitet aus der Markenfarbe hinter dem R im Logo
// (#0F0D2C) — bindet die ganze Seite ans Logo-Farbpaar Navy + Cyan und
// gibt Kacheln spürbar mehr Präsenz als das vorherige neutrale Graphit
// ("A1 Neutral Pur", #141414/#1B1B1B), bei dem Karten und Hintergrund
// nur 7 Stufen auseinanderlagen.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  // hover:/group-hover:-Utilities gelten nur noch auf Geräten mit echtem
  // Hover (Maus) — auf Touch-Geräten bleibt der Hover-Zustand nach dem
  // Antippen sonst "hängen" (z. B. Titel wirkt dauerhaft Cyan eingefärbt,
  // wie eine versehentliche Markierung).
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // HELL-UMBAU (Tim-Freigabe 15.08.2026 abends, "Danach kannst du
        // bauen"): Weiss + Navy-Tinte + Cyan, Palette aus dem abgenommenen
        // Polygon-Entwurf. Navy-Töne unten bleiben für Masthead-Text,
        // Footer und dunkle Blöcke erhalten.
        bg: {
          base: "#FFFFFF",
          elevated: "#F7F9FC",
        },
        surface: {
          card: "#F1F3F7",
          hover: "#E9EDF3",
        },
        border: {
          subtle: "#E6E9F0",
          default: "#D4D9E4",
          strong: "#B8BFCF",
        },
        accent: {
          DEFAULT: "#02F0D1",
          hover: "#30F3D9",
          active: "#02C5AB",
          wash: "#DFF9F2",
        },
        text: {
          primary: "#0C0B1A",
          secondary: "#5B5F72",
          tertiary: "#767B93",
          disabled: "#ADB2C4",
        },
        success: "#2ED47A",
        warning: "#F5B942",
        error: "#F1544B",
        // Marken-Navy-Band (Header/Hero/Footer) — minimal heller als bg.base,
        // damit die Zonen sich subtil absetzen.
        navy: {
          DEFAULT: "#0F0E20",
          raised: "#171632",
          border: "#262347",
          text: "#F1F0F2",
          muted: "#A9A9A9",
          dim: "#7D7D7D",
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
        card: "0 1px 0 0 rgba(255,255,255,0.5) inset, 0 8px 24px -12px rgba(12,11,26,0.14)",
        elevated: "0 24px 60px -20px rgba(12,11,26,0.2)",
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
