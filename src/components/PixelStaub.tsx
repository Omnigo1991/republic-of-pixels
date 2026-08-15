// PIXEL-STAUB, VERANKERT IN DER SEITE (Tim, 15.08.2026 spät): Die Partikel
// gehören zur Seite, nicht zum Bildschirm — sie sind über die GESAMTE
// Seitenlänge verstreut und bleiben beim Scrollen an ihrem Fleck (nur der
// Header-Staub scrollt mit dem Header). Damit es gewollt aussieht und
// nicht wie ein Fehler: zwei Sorten — gefüllte Pixel in mehreren Grössen
// UND ein paar winzige gedrehte Quadrat-Umrisse, unser Rauten-Motiv im
// Kleinen. Alle driften ganz langsam auf der Stelle.
// Dosis auf Tims Wunsch (15.08. spaet) kraeftig erhoeht: 130 Pixel +
// 22 Rauten, einmalig mit festem Seed erzeugt und eingefroren.
//
// Grenzen: unter dem Inhalt (Text bleibt unberührt), pointer-events-none,
// feste Positionen in Prozent der Seitenhöhe (kein Zufall zur Laufzeit),
// Stillstand bei reduzierter Bewegung.
const PIXEL: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 62.7, y: 3.0, g: 5, o: 0.15, dauer: 56 }, { x: 72.2, y: 67.2, g: 8, o: 0.13, dauer: 65 },
  { x: 3.1, y: 9.7, g: 5, o: 0.18, dauer: 52 }, { x: 55.0, y: 71.0, g: 8, o: 0.17, dauer: 66 },
  { x: 57.7, y: 80.2, g: 3, o: 0.21, dauer: 57 }, { x: 68.4, y: 34.0, g: 4, o: 0.15, dauer: 76 },
  { x: 33.0, y: 9.6, g: 4, o: 0.16, dauer: 63 }, { x: 59.2, y: 80.0, g: 7, o: 0.18, dauer: 64 },
  { x: 7.7, y: 29.4, g: 9, o: 0.23, dauer: 63 }, { x: 56.6, y: 69.9, g: 3, o: 0.2, dauer: 76 },
  { x: 28.4, y: 8.4, g: 5, o: 0.22, dauer: 64 }, { x: 27.2, y: 63.1, g: 6, o: 0.14, dauer: 63 },
  { x: 20.5, y: 26.8, g: 4, o: 0.19, dauer: 57 }, { x: 52.3, y: 24.6, g: 7, o: 0.17, dauer: 72 },
  { x: 67.4, y: 22.1, g: 6, o: 0.22, dauer: 76 }, { x: 5.5, y: 81.4, g: 6, o: 0.17, dauer: 54 },
  { x: 20.7, y: 93.4, g: 6, o: 0.15, dauer: 67 }, { x: 38.8, y: 90.6, g: 7, o: 0.14, dauer: 56 },
  { x: 24.2, y: 55.8, g: 5, o: 0.21, dauer: 65 }, { x: 88.0, y: 39.8, g: 5, o: 0.24, dauer: 56 },
  { x: 49.9, y: 9.5, g: 3, o: 0.22, dauer: 56 }, { x: 61.5, y: 78.5, g: 6, o: 0.19, dauer: 64 },
  { x: 37.4, y: 98.6, g: 8, o: 0.15, dauer: 69 }, { x: 84.4, y: 1.6, g: 4, o: 0.2, dauer: 69 },
  { x: 73.6, y: 76.2, g: 6, o: 0.13, dauer: 65 }, { x: 15.5, y: 0.8, g: 5, o: 0.24, dauer: 76 },
  { x: 17.5, y: 90.4, g: 5, o: 0.22, dauer: 68 }, { x: 59.7, y: 15.6, g: 4, o: 0.18, dauer: 76 },
  { x: 90.4, y: 91.0, g: 9, o: 0.16, dauer: 52 }, { x: 11.0, y: 36.3, g: 5, o: 0.15, dauer: 59 },
  { x: 86.0, y: 93.8, g: 4, o: 0.21, dauer: 78 }, { x: 6.8, y: 75.4, g: 4, o: 0.14, dauer: 67 },
  { x: 92.8, y: 16.8, g: 8, o: 0.22, dauer: 65 }, { x: 94.5, y: 92.0, g: 5, o: 0.21, dauer: 64 },
  { x: 97.5, y: 64.5, g: 7, o: 0.23, dauer: 66 }, { x: 11.9, y: 22.6, g: 6, o: 0.12, dauer: 69 },
  { x: 22.6, y: 22.2, g: 4, o: 0.2, dauer: 53 }, { x: 22.4, y: 89.7, g: 6, o: 0.13, dauer: 59 },
  { x: 27.3, y: 48.3, g: 8, o: 0.14, dauer: 80 }, { x: 56.0, y: 47.1, g: 7, o: 0.22, dauer: 58 },
  { x: 9.2, y: 65.4, g: 6, o: 0.17, dauer: 66 }, { x: 84.7, y: 5.8, g: 4, o: 0.13, dauer: 75 },
  { x: 33.3, y: 85.4, g: 5, o: 0.14, dauer: 69 }, { x: 44.0, y: 42.1, g: 5, o: 0.18, dauer: 79 },
  { x: 90.5, y: 44.1, g: 8, o: 0.13, dauer: 72 }, { x: 97.9, y: 82.8, g: 4, o: 0.23, dauer: 79 },
  { x: 23.2, y: 40.5, g: 7, o: 0.15, dauer: 64 }, { x: 88.4, y: 16.7, g: 3, o: 0.24, dauer: 60 },
  { x: 90.8, y: 77.8, g: 5, o: 0.17, dauer: 75 }, { x: 97.6, y: 55.2, g: 7, o: 0.14, dauer: 61 },
  { x: 21.3, y: 6.3, g: 8, o: 0.13, dauer: 62 }, { x: 5.6, y: 58.0, g: 8, o: 0.23, dauer: 68 },
  { x: 15.4, y: 95.1, g: 4, o: 0.22, dauer: 54 }, { x: 58.3, y: 67.0, g: 5, o: 0.17, dauer: 80 },
  { x: 55.8, y: 57.5, g: 3, o: 0.19, dauer: 65 }, { x: 64.4, y: 56.2, g: 6, o: 0.23, dauer: 58 },
  { x: 65.6, y: 31.4, g: 5, o: 0.17, dauer: 73 }, { x: 63.3, y: 45.5, g: 4, o: 0.12, dauer: 71 },
  { x: 97.8, y: 98.6, g: 4, o: 0.18, dauer: 68 }, { x: 26.0, y: 92.4, g: 4, o: 0.23, dauer: 63 },
  { x: 27.9, y: 43.7, g: 8, o: 0.2, dauer: 71 }, { x: 96.4, y: 80.0, g: 8, o: 0.12, dauer: 78 },
  { x: 54.4, y: 92.3, g: 4, o: 0.23, dauer: 56 }, { x: 25.9, y: 88.1, g: 8, o: 0.14, dauer: 61 },
  { x: 59.3, y: 71.2, g: 5, o: 0.2, dauer: 79 }, { x: 25.9, y: 48.6, g: 3, o: 0.13, dauer: 65 },
  { x: 81.3, y: 4.8, g: 6, o: 0.21, dauer: 72 }, { x: 96.0, y: 16.4, g: 7, o: 0.19, dauer: 65 },
  { x: 55.0, y: 11.5, g: 4, o: 0.19, dauer: 78 }, { x: 36.2, y: 54.9, g: 6, o: 0.14, dauer: 61 },
  { x: 35.7, y: 92.4, g: 3, o: 0.23, dauer: 58 }, { x: 66.8, y: 66.2, g: 6, o: 0.21, dauer: 80 },
  { x: 85.7, y: 96.4, g: 4, o: 0.23, dauer: 59 }, { x: 84.7, y: 96.7, g: 4, o: 0.23, dauer: 52 },
  { x: 17.6, y: 91.6, g: 6, o: 0.22, dauer: 79 }, { x: 72.0, y: 24.9, g: 4, o: 0.21, dauer: 55 },
  { x: 37.5, y: 4.3, g: 7, o: 0.15, dauer: 78 }, { x: 90.0, y: 34.9, g: 5, o: 0.15, dauer: 73 },
  { x: 18.9, y: 32.8, g: 4, o: 0.24, dauer: 60 }, { x: 34.4, y: 50.7, g: 8, o: 0.16, dauer: 52 },
  { x: 11.3, y: 96.1, g: 4, o: 0.19, dauer: 60 }, { x: 3.7, y: 59.3, g: 6, o: 0.21, dauer: 62 },
  { x: 42.8, y: 97.4, g: 4, o: 0.17, dauer: 70 }, { x: 18.6, y: 4.9, g: 6, o: 0.12, dauer: 77 },
  { x: 52.8, y: 71.4, g: 5, o: 0.16, dauer: 54 }, { x: 93.0, y: 91.2, g: 9, o: 0.16, dauer: 79 },
  { x: 12.2, y: 89.2, g: 8, o: 0.16, dauer: 65 }, { x: 32.0, y: 69.2, g: 8, o: 0.14, dauer: 65 },
  { x: 65.2, y: 37.8, g: 4, o: 0.19, dauer: 61 }, { x: 39.8, y: 82.6, g: 5, o: 0.15, dauer: 65 },
  { x: 77.0, y: 60.3, g: 6, o: 0.18, dauer: 66 }, { x: 66.2, y: 50.9, g: 4, o: 0.2, dauer: 61 },
  { x: 50.5, y: 62.8, g: 6, o: 0.13, dauer: 76 }, { x: 23.0, y: 31.1, g: 5, o: 0.14, dauer: 53 },
  { x: 24.0, y: 47.3, g: 4, o: 0.17, dauer: 80 }, { x: 61.7, y: 19.7, g: 6, o: 0.18, dauer: 59 },
  { x: 14.5, y: 68.2, g: 4, o: 0.21, dauer: 59 }, { x: 17.2, y: 94.9, g: 8, o: 0.18, dauer: 69 },
  { x: 24.4, y: 84.1, g: 7, o: 0.14, dauer: 66 }, { x: 65.4, y: 97.8, g: 9, o: 0.16, dauer: 76 },
  { x: 87.4, y: 60.8, g: 8, o: 0.17, dauer: 69 }, { x: 43.7, y: 16.2, g: 7, o: 0.17, dauer: 76 },
  { x: 24.2, y: 63.3, g: 8, o: 0.18, dauer: 59 }, { x: 26.9, y: 8.1, g: 5, o: 0.15, dauer: 62 },
  { x: 31.3, y: 53.7, g: 4, o: 0.14, dauer: 64 }, { x: 68.0, y: 70.1, g: 4, o: 0.17, dauer: 62 },
  { x: 53.2, y: 41.5, g: 5, o: 0.22, dauer: 64 }, { x: 88.7, y: 58.0, g: 3, o: 0.22, dauer: 76 },
  { x: 56.4, y: 47.5, g: 6, o: 0.16, dauer: 64 }, { x: 83.6, y: 94.4, g: 6, o: 0.18, dauer: 75 },
  { x: 53.5, y: 59.9, g: 5, o: 0.18, dauer: 60 }, { x: 42.7, y: 3.4, g: 6, o: 0.2, dauer: 77 },
  { x: 39.6, y: 16.8, g: 7, o: 0.23, dauer: 71 }, { x: 52.3, y: 89.8, g: 9, o: 0.19, dauer: 52 },
  { x: 8.2, y: 42.7, g: 7, o: 0.14, dauer: 60 }, { x: 37.2, y: 21.3, g: 6, o: 0.16, dauer: 80 },
  { x: 37.2, y: 74.6, g: 6, o: 0.15, dauer: 54 }, { x: 46.1, y: 74.3, g: 3, o: 0.24, dauer: 63 },
  { x: 22.0, y: 7.3, g: 3, o: 0.21, dauer: 59 }, { x: 19.5, y: 2.5, g: 4, o: 0.15, dauer: 67 },
  { x: 65.6, y: 56.1, g: 5, o: 0.18, dauer: 60 }, { x: 75.2, y: 17.0, g: 9, o: 0.24, dauer: 74 },
  { x: 11.2, y: 81.2, g: 5, o: 0.13, dauer: 52 }, { x: 91.0, y: 57.2, g: 6, o: 0.17, dauer: 74 },
  { x: 19.4, y: 58.8, g: 5, o: 0.13, dauer: 76 }, { x: 29.6, y: 67.9, g: 4, o: 0.22, dauer: 70 },
  { x: 76.7, y: 34.7, g: 6, o: 0.2, dauer: 54 }, { x: 49.6, y: 34.1, g: 6, o: 0.22, dauer: 55 },
  { x: 42.5, y: 36.2, g: 7, o: 0.2, dauer: 65 }, { x: 17.3, y: 51.9, g: 5, o: 0.19, dauer: 69 },
];

// Gedrehte Quadrat-Umrisse — die Raute der Event-Kachel im Miniaturformat.
const RAUTEN: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 74.6, y: 46.1, g: 16, o: 0.27, dauer: 62 }, { x: 31.6, y: 24.8, g: 10, o: 0.21, dauer: 68 },
  { x: 24.2, y: 46.1, g: 14, o: 0.26, dauer: 64 }, { x: 3.7, y: 83.5, g: 11, o: 0.24, dauer: 65 },
  { x: 76.8, y: 34.0, g: 14, o: 0.26, dauer: 62 }, { x: 53.8, y: 51.1, g: 11, o: 0.19, dauer: 67 },
  { x: 47.4, y: 74.5, g: 15, o: 0.24, dauer: 69 }, { x: 43.6, y: 2.7, g: 12, o: 0.21, dauer: 61 },
  { x: 30.1, y: 57.4, g: 13, o: 0.25, dauer: 65 }, { x: 41.4, y: 73.4, g: 12, o: 0.22, dauer: 68 },
  { x: 26.7, y: 25.4, g: 10, o: 0.27, dauer: 64 }, { x: 12.4, y: 53.0, g: 16, o: 0.26, dauer: 60 },
  { x: 21.6, y: 48.0, g: 15, o: 0.25, dauer: 70 }, { x: 57.7, y: 96.1, g: 16, o: 0.2, dauer: 61 },
  { x: 35.3, y: 30.3, g: 15, o: 0.24, dauer: 62 }, { x: 5.3, y: 6.3, g: 12, o: 0.26, dauer: 58 },
  { x: 61.6, y: 74.0, g: 10, o: 0.28, dauer: 72 }, { x: 28.0, y: 47.4, g: 12, o: 0.2, dauer: 55 },
  { x: 25.0, y: 84.6, g: 10, o: 0.28, dauer: 66 }, { x: 47.7, y: 57.0, g: 15, o: 0.19, dauer: 58 },
  { x: 78.1, y: 93.1, g: 10, o: 0.3, dauer: 57 }, { x: 54.0, y: 41.4, g: 14, o: 0.27, dauer: 61 },
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
