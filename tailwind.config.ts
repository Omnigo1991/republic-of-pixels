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
      // FARBRICHTUNG "TIEFSEE" (Tim-Entscheid 15.08.2026 aus fuenf Varianten):
      // Flaechen und Raender liegen im Blaugruenen statt im Violetten — sie
      // stammen aus derselben Familie wie das Cyan und wirken dadurch aus
      // einem Guss. Navy #0C0B1A und Cyan #02F0D1 sind Markenwerte und
      // bleiben exakt unveraendert (CLAUDE.md).
      colors: {
        bg: {
          base: "#0C0B1A",
          elevated: "#0E1822",
        },
        surface: {
          card: "#102028",
          hover: "#16303A",
        },
        border: {
          subtle: "#1C3A44",
          default: "#28505C",
          strong: "#356878",
        },
        accent: {
          DEFAULT: "#02F0D1",
          hover: "#30F3D9",
          active: "#02C5AB",
          wash: "#0C3A43",
        },
        text: {
          primary: "#F1F0F2",
          secondary: "#A9A9A9",
          tertiary: "#7D7D7D",
          disabled: "#535353",
        },
        success: "#2ED47A",
        warning: "#F5B942",
        error: "#F1544B",
        // Marken-Navy-Band (Header/Hero/Footer) — minimal heller als bg.base,
        // damit die Zonen sich subtil absetzen.
        navy: {
          DEFAULT: "#0D141C",
          raised: "#132430",
          border: "#1C3A44",
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
