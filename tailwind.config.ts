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
        // NAVY-UMBAU (Tim, 17.08.2026): derselbe Aufbau wie der Hell-Stand,
        // nur der Grund kippt von Weiss auf Navy. Die Inhaltsboxen tragen
        // jetzt VOLLES Cyan (#02F0D1) mit Navy-Schrift — Tims Entscheid.
        bg: {
          base: "#0C0B1A",
          elevated: "#14132A",
        },
        surface: {
          // card = die VIELEN kleinen Karten (Release-, Event-, Deal-,
          // Charts-Radar ...). Navy mit 12 % Cyan-Schleier plus
          // Cyan-Kante: gehoert sichtbar zur Cyan-Familie, ohne dass die
          // Seite zur Neon-Wand wird. Volles #02F0D1 bleibt den drei
          // grossen Boxen vorbehalten (Newsletter, Naechstes Event,
          // "Warum das wichtig ist") — Tim, 17.08.2026.
          card: "#0B2630",
          hover: "#103038",
          // panel = Bedienflaeche (Suche, Kommentare, Dialoge, Admin).
          // Die bleiben dunkel: Neon-Cyan unter einem Eingabefeld waere
          // weder lesbar noch gemeint.
          panel: "#14132A",
          panelhover: "#1B1A36",
        },
        border: {
          subtle: "rgba(2, 240, 209, 0.28)",
          default: "rgba(2, 240, 209, 0.4)",
          strong: "rgba(2, 240, 209, 0.55)",
        },
        accent: {
          DEFAULT: "#02F0D1",
          hover: "#30F3D9",
          active: "#02C5AB",
          wash: "#12303A",
        },
        text: {
          primary: "#F1F0F2",
          secondary: "#B7BACB",
          tertiary: "#8A8FA3",
          disabled: "#8F95A9",
          // Schrift auf Cyan-Flaechen.
          oncyan: "#0C0B1A",
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
        // Nur fuer den Willkommensgruss ueber dem Aufmacher.
        marker: ["var(--font-marker)", "Permanent Marker", "cursive"],
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
