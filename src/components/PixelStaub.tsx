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


// Flaechen-Staub: hauchzarte Pixel ueber dem GESAMTEN Hintergrund —
// Deckkraft maximal 0.1, Groesse 3-6px. Er liegt UNTER dem Inhalt
// (z-0, Inhalt rendert darueber); Text bleibt voll lesbar, der Staub
// wirkt wie eine feine Papierstruktur. Positionen in Prozent, fest
// verdrahtet.
const FLAECHE: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 8, y: 14, g: 4, o: 0.09, dauer: 64 }, { x: 15, y: 46, g: 3, o: 0.06, dauer: 72 },
  { x: 11, y: 78, g: 5, o: 0.08, dauer: 58 }, { x: 22, y: 27, g: 3, o: 0.05, dauer: 76 },
  { x: 27, y: 64, g: 4, o: 0.07, dauer: 66 }, { x: 34, y: 9, g: 5, o: 0.08, dauer: 60 },
  { x: 38, y: 88, g: 3, o: 0.05, dauer: 74 }, { x: 45, y: 38, g: 4, o: 0.06, dauer: 70 },
  { x: 52, y: 72, g: 3, o: 0.05, dauer: 78 }, { x: 57, y: 18, g: 4, o: 0.07, dauer: 62 },
  { x: 63, y: 54, g: 5, o: 0.08, dauer: 56 }, { x: 69, y: 84, g: 3, o: 0.05, dauer: 80 },
  { x: 74, y: 31, g: 4, o: 0.06, dauer: 68 }, { x: 81, y: 61, g: 3, o: 0.05, dauer: 75 },
  { x: 86, y: 12, g: 5, o: 0.08, dauer: 59 }, { x: 91, y: 42, g: 4, o: 0.07, dauer: 65 },
  { x: 95, y: 74, g: 3, o: 0.06, dauer: 71 }, { x: 48, y: 95, g: 4, o: 0.06, dauer: 63 },
];

export function PixelStaub() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    >
      {FLAECHE.map((p, i) => (
        <span
          key={`f${i}`}
          className="staub-pixel absolute bg-accent"
          style={{
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            width: `${p.g}px`,
            height: `${p.g}px`,
            opacity: p.o,
            animationDuration: `${p.dauer}s`,
            animationDelay: `${-i * 5}s`,
          }}
        />
      ))}
      <span className="hidden min-[1500px]:contents">
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
      </span>
    </div>
  );
}
