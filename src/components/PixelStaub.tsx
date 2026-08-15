// PIXEL-STAUB, VERANKERT IN DER SEITE (Tim, 15.08.2026 spät): Die Partikel
// gehören zur Seite, nicht zum Bildschirm — sie sind über die GESAMTE
// Seitenlänge verstreut und bleiben beim Scrollen an ihrem Fleck (nur der
// Header-Staub scrollt mit dem Header). Damit es gewollt aussieht und
// nicht wie ein Fehler: zwei Sorten — gefüllte Pixel in mehreren Grössen
// UND ein paar winzige gedrehte Quadrat-Umrisse, unser Rauten-Motiv im
// Kleinen. Alle driften ganz langsam auf der Stelle.
//
// Grenzen: unter dem Inhalt (Text bleibt unberührt), pointer-events-none,
// feste Positionen in Prozent der Seitenhöhe (kein Zufall zur Laufzeit),
// Stillstand bei reduzierter Bewegung.
const PIXEL: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 3, y: 2, g: 8, o: 0.2, dauer: 58 }, { x: 12, y: 4, g: 4, o: 0.13, dauer: 70 },
  { x: 30, y: 3, g: 6, o: 0.16, dauer: 64 }, { x: 55, y: 5, g: 4, o: 0.12, dauer: 74 },
  { x: 78, y: 2, g: 7, o: 0.18, dauer: 60 }, { x: 94, y: 6, g: 5, o: 0.14, dauer: 68 },
  { x: 7, y: 11, g: 5, o: 0.14, dauer: 66 }, { x: 24, y: 13, g: 9, o: 0.22, dauer: 54 },
  { x: 47, y: 10, g: 4, o: 0.12, dauer: 76 }, { x: 68, y: 14, g: 6, o: 0.16, dauer: 62 },
  { x: 89, y: 12, g: 4, o: 0.13, dauer: 72 }, { x: 16, y: 22, g: 6, o: 0.16, dauer: 63 },
  { x: 38, y: 20, g: 4, o: 0.12, dauer: 78 }, { x: 61, y: 24, g: 8, o: 0.2, dauer: 56 },
  { x: 83, y: 21, g: 5, o: 0.14, dauer: 69 }, { x: 97, y: 25, g: 6, o: 0.17, dauer: 61 },
  { x: 5, y: 33, g: 4, o: 0.12, dauer: 75 }, { x: 28, y: 31, g: 7, o: 0.18, dauer: 59 },
  { x: 52, y: 35, g: 5, o: 0.13, dauer: 71 }, { x: 74, y: 32, g: 4, o: 0.12, dauer: 77 },
  { x: 92, y: 36, g: 8, o: 0.2, dauer: 57 }, { x: 10, y: 44, g: 6, o: 0.16, dauer: 65 },
  { x: 34, y: 46, g: 4, o: 0.12, dauer: 79 }, { x: 58, y: 43, g: 6, o: 0.15, dauer: 67 },
  { x: 80, y: 47, g: 5, o: 0.14, dauer: 70 }, { x: 2, y: 56, g: 9, o: 0.22, dauer: 55 },
  { x: 21, y: 58, g: 4, o: 0.12, dauer: 74 }, { x: 44, y: 54, g: 6, o: 0.16, dauer: 62 },
  { x: 66, y: 57, g: 4, o: 0.13, dauer: 73 }, { x: 87, y: 55, g: 7, o: 0.18, dauer: 58 },
  { x: 14, y: 67, g: 5, o: 0.14, dauer: 68 }, { x: 36, y: 69, g: 8, o: 0.19, dauer: 56 },
  { x: 59, y: 66, g: 4, o: 0.12, dauer: 76 }, { x: 81, y: 68, g: 6, o: 0.16, dauer: 64 },
  { x: 96, y: 64, g: 4, o: 0.13, dauer: 72 }, { x: 6, y: 78, g: 6, o: 0.16, dauer: 63 },
  { x: 27, y: 80, g: 4, o: 0.12, dauer: 78 }, { x: 50, y: 77, g: 7, o: 0.17, dauer: 60 },
  { x: 72, y: 81, g: 5, o: 0.14, dauer: 69 }, { x: 91, y: 79, g: 8, o: 0.2, dauer: 57 },
  { x: 18, y: 89, g: 5, o: 0.13, dauer: 71 }, { x: 41, y: 91, g: 6, o: 0.15, dauer: 66 },
  { x: 64, y: 88, g: 4, o: 0.12, dauer: 75 }, { x: 85, y: 92, g: 6, o: 0.16, dauer: 62 },
  { x: 45, y: 97, g: 5, o: 0.14, dauer: 68 }, { x: 9, y: 96, g: 4, o: 0.12, dauer: 74 },
];

// Gedrehte Quadrat-Umrisse — die Raute der Event-Kachel im Miniaturformat.
const RAUTEN: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 19, y: 7, g: 13, o: 0.25, dauer: 62 },
  { x: 71, y: 18, g: 11, o: 0.2, dauer: 68 },
  { x: 42, y: 28, g: 15, o: 0.28, dauer: 58 },
  { x: 88, y: 41, g: 12, o: 0.22, dauer: 64 },
  { x: 8, y: 51, g: 14, o: 0.25, dauer: 60 },
  { x: 55, y: 62, g: 11, o: 0.2, dauer: 70 },
  { x: 30, y: 74, g: 13, o: 0.24, dauer: 63 },
  { x: 77, y: 86, g: 15, o: 0.26, dauer: 59 },
  { x: 12, y: 94, g: 11, o: 0.2, dauer: 66 },
];

export function PixelStaub() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {PIXEL.map((p, i) => (
        <span
          key={`p${i}`}
          className="staub-pixel absolute bg-accent"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.g}px`,
            height: `${p.g}px`,
            opacity: p.o,
            animationDuration: `${p.dauer}s`,
            animationDelay: `${-i * 4}s`,
          }}
        />
      ))}
      {RAUTEN.map((r, i) => (
        <span
          key={`r${i}`}
          className="staub-raute absolute border-[1.5px] border-accent"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: `${r.g}px`,
            height: `${r.g}px`,
            opacity: r.o,
            animationDuration: `${r.dauer}s`,
            animationDelay: `${-i * 6}s`,
          }}
        />
      ))}
    </div>
  );
}
