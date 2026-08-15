// PIXEL-STAUB (Tim, 15.08.2026 abends): Der Staubschweif des R weht als
// feine Cyan-Streuung durch die SEITENRÄNDER — die leeren Zonen links und
// rechts der Inhaltsspalte, die es nur auf breiten Bildschirmen gibt.
// Bewusste Grenzen, damit nie etwas Wichtiges gestört wird:
// - Nur ab 1500px Fensterbreite (darunter gibt es keine leeren Ränder).
// - Pixel sitzen in den äussersten 70px, die Inhaltsspalte (1280px
//   zentriert) bleibt unberührt.
// - pointer-events-none, nichts ist anklickbar oder verdeckt Klicks.
// - Positionen sind FEST verdrahtet (kein Zufall zur Laufzeit), damit
//   Server und Browser dasselbe rendern.
// - Sehr langsame Drift (40-70s); bei reduzierter Bewegung steht alles
//   still (globals.css).
const STAUB: {
  seite: "links" | "rechts";
  abstand: number; // px vom Rand
  oben: number; // vh
  groesse: number;
  deckkraft: number;
  dauer: number; // s
}[] = [
  { seite: "links", abstand: 22, oben: 12, groesse: 9, deckkraft: 0.35, dauer: 52 },
  { seite: "links", abstand: 48, oben: 19, groesse: 5, deckkraft: 0.2, dauer: 66 },
  { seite: "links", abstand: 12, oben: 31, groesse: 12, deckkraft: 0.5, dauer: 44 },
  { seite: "links", abstand: 40, oben: 42, groesse: 7, deckkraft: 0.25, dauer: 58 },
  { seite: "links", abstand: 18, oben: 55, groesse: 5, deckkraft: 0.18, dauer: 70 },
  { seite: "links", abstand: 55, oben: 63, groesse: 10, deckkraft: 0.4, dauer: 48 },
  { seite: "links", abstand: 28, oben: 76, groesse: 6, deckkraft: 0.22, dauer: 62 },
  { seite: "links", abstand: 46, oben: 88, groesse: 8, deckkraft: 0.3, dauer: 54 },
  { seite: "rechts", abstand: 30, oben: 9, groesse: 6, deckkraft: 0.22, dauer: 60 },
  { seite: "rechts", abstand: 14, oben: 22, groesse: 10, deckkraft: 0.42, dauer: 46 },
  { seite: "rechts", abstand: 50, oben: 34, groesse: 5, deckkraft: 0.18, dauer: 68 },
  { seite: "rechts", abstand: 24, oben: 47, groesse: 12, deckkraft: 0.5, dauer: 42 },
  { seite: "rechts", abstand: 44, oben: 59, groesse: 7, deckkraft: 0.28, dauer: 56 },
  { seite: "rechts", abstand: 16, oben: 71, groesse: 5, deckkraft: 0.2, dauer: 64 },
  { seite: "rechts", abstand: 52, oben: 82, groesse: 9, deckkraft: 0.35, dauer: 50 },
  { seite: "rechts", abstand: 32, oben: 93, groesse: 6, deckkraft: 0.24, dauer: 58 },
];

export function PixelStaub() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden min-[1500px]:block"
    >
      {STAUB.map((p, i) => (
        <span
          key={i}
          className="staub-pixel absolute bg-accent"
          style={{
            [p.seite === "links" ? "left" : "right"]: `${p.abstand}px`,
            top: `${p.oben}vh`,
            width: `${p.groesse}px`,
            height: `${p.groesse}px`,
            opacity: p.deckkraft,
            animationDuration: `${p.dauer}s`,
            animationDelay: `${-i * 7}s`,
          }}
        />
      ))}
    </div>
  );
}
