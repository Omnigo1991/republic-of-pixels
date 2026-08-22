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
        // CYBERPUNK-UMBAU (Tim, 18.08.2026): loest den Navy-Stand ab.
        // Drei Pole statt zwei — Cyan bleibt die Marke, Magenta ist der
        // Gegenpol, Violett vermittelt. Der Grund ist tiefer als das
        // bisherige Navy, damit Neon ueberhaupt leuchten kann.
        bg: {
          base: "#0C0B1A",
          elevated: "#14122E",
        },
        surface: {
          // card = die Inhaltskarten. Fassung "C1": spuerbar hellere
          // Flaeche mit Verlaufskante, gleiche Kappecke wie die
          // Bildkacheln. Vorher hob sie sich kaum vom Grund ab.
          card: "#14122E",
          hover: "#1B1840",
          // panel = Bedienflaeche (Suche, Kommentare, Dialoge, Admin)
          panel: "#11102A",
          panelhover: "#191735",
        },
        border: {
          subtle: "rgba(2, 240, 209, 0.30)",
          default: "rgba(2, 240, 209, 0.44)",
          strong: "rgba(2, 240, 209, 0.62)",
        },
        accent: {
          DEFAULT: "#02F0D1",
          hover: "#7DF9FF",
          active: "#02C5AB",
          wash: "#0E2A34",
        },
        // Gegenpole der Cyberpunk-Palette
        magenta: "#FF2E97",
        violett: "#B14CFF",
        saeure: "#E8FF3D",
        text: {
          primary: "#EAF6FF",
          secondary: "#C2D2E4",
          tertiary: "#93A6BC",
          disabled: "#7C8DA3",
          oncyan: "#04121A",
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
          muted: "#C7CAD8",
          dim: "#8A8FA3",
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
        // 70rem = 1120 px - die Breite des abgenommenen Entwurfs
        // (gemessen 22.08.2026: Entwurf 1072 Inhalt, Seite war 1216).
        content: "70rem",
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
        vorhang: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        vorhang: "vorhang 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
