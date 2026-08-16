// PIXEL-STAUB, VERANKERT IN DER SEITE (Tim, 15.08.2026 spät): Die Partikel
// gehören zur Seite, nicht zum Bildschirm — sie sind über die GESAMTE
// Seitenlänge verstreut und bleiben beim Scrollen an ihrem Fleck (nur der
// Header-Staub scrollt mit dem Header). Damit es gewollt aussieht und
// nicht wie ein Fehler: zwei Sorten — gefüllte Pixel in mehreren Grössen
// UND ein paar winzige gedrehte Quadrat-Umrisse, unser Rauten-Motiv im
// Kleinen. Alle driften ganz langsam auf der Stelle.
// Dosis zweimal auf Tims Wunsch erhoeht (15.08. spaet): jetzt 260 Pixel
// + 40 Rauten bei 18-40% Deckkraft — deutlich wahrnehmbar. Konstruktiv
// sicher: Die Ebene liegt UNTER dem Inhalt, Partikel leben nur auf dem
// weissen Grund und stehen nie ueber Text oder Bild.
//
// NUR IN DEN RAENDERN (Tim, 16.08.2026): Partikel in der Lesespalte
// irritieren beim Lesen. Der Staub lebt jetzt ausschliesslich links
// aussen (bis 13.5 %) und rechts aussen (ab 86.5 %) — und erst ab
// 1560px Fensterbreite: Die Inhaltsspalte ist 1280px breit, darunter
// gibt es schlicht keine freien Raender.
// Grenzen: unter dem Inhalt (Text bleibt unberührt), pointer-events-none,
// feste Positionen in Prozent der Seitenhöhe (kein Zufall zur Laufzeit),
// Stillstand bei reduzierter Bewegung.
const PIXEL: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 2.0, y: 50.1, g: 8, o: 0.28, dauer: 56 }, { x: 97.6, y: 89.0, g: 9, o: 0.26, dauer: 81 },
  { x: 10.3, y: 58.5, g: 5, o: 0.16, dauer: 55 }, { x: 87.9, y: 81.3, g: 7, o: 0.16, dauer: 81 },
  { x: 9.3, y: 21.2, g: 5, o: 0.22, dauer: 72 }, { x: 96.6, y: 99.4, g: 8, o: 0.27, dauer: 71 },
  { x: 1.7, y: 53.7, g: 5, o: 0.24, dauer: 69 }, { x: 86.8, y: 70.8, g: 6, o: 0.24, dauer: 55 },
  { x: 5.7, y: 58.4, g: 7, o: 0.32, dauer: 77 }, { x: 92.8, y: 74.7, g: 9, o: 0.32, dauer: 75 },
  { x: 12.4, y: 26.0, g: 6, o: 0.26, dauer: 80 }, { x: 92.9, y: 80.1, g: 9, o: 0.2, dauer: 58 },
  { x: 11.1, y: 95.7, g: 8, o: 0.32, dauer: 56 }, { x: 95.5, y: 42.9, g: 4, o: 0.25, dauer: 64 },
  { x: 11.5, y: 12.5, g: 7, o: 0.28, dauer: 66 }, { x: 93.5, y: 66.7, g: 5, o: 0.26, dauer: 82 },
  { x: 9.6, y: 80.1, g: 6, o: 0.24, dauer: 68 }, { x: 96.9, y: 1.3, g: 4, o: 0.28, dauer: 79 },
  { x: 10.9, y: 92.2, g: 6, o: 0.33, dauer: 66 }, { x: 95.2, y: 46.6, g: 7, o: 0.31, dauer: 52 },
  { x: 11.3, y: 31.7, g: 4, o: 0.24, dauer: 82 }, { x: 89.7, y: 91.7, g: 4, o: 0.33, dauer: 80 },
  { x: 12.7, y: 64.6, g: 7, o: 0.23, dauer: 62 }, { x: 95.8, y: 41.1, g: 7, o: 0.32, dauer: 55 },
  { x: 0.5, y: 57.9, g: 4, o: 0.27, dauer: 62 }, { x: 89.6, y: 61.9, g: 8, o: 0.33, dauer: 72 },
  { x: 2.5, y: 31.4, g: 9, o: 0.26, dauer: 81 }, { x: 95.1, y: 93.2, g: 8, o: 0.2, dauer: 58 },
  { x: 13.0, y: 87.1, g: 8, o: 0.21, dauer: 76 }, { x: 94.9, y: 93.0, g: 9, o: 0.22, dauer: 76 },
  { x: 5.6, y: 15.1, g: 5, o: 0.23, dauer: 56 }, { x: 91.4, y: 7.7, g: 6, o: 0.28, dauer: 51 },
  { x: 0.8, y: 47.5, g: 10, o: 0.21, dauer: 70 }, { x: 97.9, y: 49.7, g: 7, o: 0.26, dauer: 60 },
  { x: 2.5, y: 51.8, g: 6, o: 0.27, dauer: 79 }, { x: 94.0, y: 67.6, g: 4, o: 0.26, dauer: 52 },
  { x: 3.0, y: 91.6, g: 3, o: 0.28, dauer: 53 }, { x: 92.1, y: 75.1, g: 5, o: 0.25, dauer: 51 },
  { x: 2.2, y: 52.9, g: 8, o: 0.32, dauer: 58 }, { x: 88.5, y: 84.0, g: 6, o: 0.21, dauer: 76 },
  { x: 11.8, y: 38.3, g: 4, o: 0.22, dauer: 66 }, { x: 92.3, y: 99.3, g: 6, o: 0.21, dauer: 61 },
  { x: 4.7, y: 48.1, g: 4, o: 0.25, dauer: 67 }, { x: 96.7, y: 84.3, g: 5, o: 0.16, dauer: 55 },
  { x: 11.9, y: 64.3, g: 6, o: 0.26, dauer: 61 }, { x: 98.5, y: 35.2, g: 4, o: 0.22, dauer: 63 },
  { x: 1.9, y: 71.3, g: 8, o: 0.3, dauer: 63 }, { x: 93.6, y: 56.1, g: 10, o: 0.26, dauer: 56 },
  { x: 10.7, y: 9.9, g: 6, o: 0.19, dauer: 53 }, { x: 96.0, y: 71.9, g: 4, o: 0.28, dauer: 56 },
  { x: 7.1, y: 27.8, g: 4, o: 0.21, dauer: 70 }, { x: 88.5, y: 25.8, g: 3, o: 0.23, dauer: 66 },
  { x: 5.9, y: 1.9, g: 4, o: 0.2, dauer: 69 }, { x: 88.0, y: 68.3, g: 9, o: 0.34, dauer: 72 },
  { x: 4.6, y: 45.5, g: 10, o: 0.28, dauer: 52 }, { x: 98.1, y: 31.7, g: 5, o: 0.27, dauer: 77 },
  { x: 13.2, y: 87.4, g: 10, o: 0.23, dauer: 82 }, { x: 95.0, y: 91.8, g: 6, o: 0.21, dauer: 72 },
  { x: 1.2, y: 71.2, g: 3, o: 0.21, dauer: 71 }, { x: 90.1, y: 95.3, g: 4, o: 0.21, dauer: 76 },
  { x: 4.6, y: 89.8, g: 8, o: 0.33, dauer: 62 }, { x: 93.5, y: 71.8, g: 4, o: 0.19, dauer: 57 },
  { x: 2.0, y: 12.8, g: 6, o: 0.27, dauer: 69 }, { x: 86.9, y: 57.6, g: 6, o: 0.23, dauer: 74 },
  { x: 3.6, y: 42.1, g: 5, o: 0.3, dauer: 61 }, { x: 93.3, y: 65.9, g: 8, o: 0.28, dauer: 75 },
  { x: 12.1, y: 78.3, g: 5, o: 0.16, dauer: 67 }, { x: 93.3, y: 41.8, g: 6, o: 0.18, dauer: 55 },
  { x: 11.4, y: 55.1, g: 10, o: 0.32, dauer: 82 }, { x: 96.7, y: 34.1, g: 8, o: 0.3, dauer: 70 },
  { x: 1.2, y: 83.6, g: 10, o: 0.34, dauer: 80 }, { x: 87.2, y: 22.4, g: 8, o: 0.32, dauer: 75 },
  { x: 9.7, y: 36.0, g: 5, o: 0.26, dauer: 67 }, { x: 90.8, y: 20.3, g: 6, o: 0.24, dauer: 79 },
  { x: 7.6, y: 47.3, g: 10, o: 0.26, dauer: 62 }, { x: 88.5, y: 41.0, g: 7, o: 0.32, dauer: 72 },
  { x: 11.1, y: 83.1, g: 6, o: 0.3, dauer: 61 }, { x: 87.6, y: 37.3, g: 5, o: 0.18, dauer: 56 },
  { x: 13.5, y: 2.2, g: 5, o: 0.31, dauer: 69 }, { x: 93.7, y: 95.0, g: 6, o: 0.26, dauer: 60 },
  { x: 13.0, y: 10.8, g: 4, o: 0.29, dauer: 71 }, { x: 93.3, y: 31.1, g: 9, o: 0.28, dauer: 62 },
  { x: 2.6, y: 29.4, g: 8, o: 0.21, dauer: 58 }, { x: 98.7, y: 19.1, g: 10, o: 0.16, dauer: 80 },
  { x: 12.7, y: 35.6, g: 8, o: 0.19, dauer: 51 }, { x: 88.7, y: 53.8, g: 4, o: 0.17, dauer: 57 },
  { x: 7.2, y: 87.8, g: 10, o: 0.3, dauer: 73 }, { x: 87.3, y: 30.4, g: 8, o: 0.19, dauer: 65 },
  { x: 2.1, y: 97.9, g: 7, o: 0.18, dauer: 54 }, { x: 91.3, y: 61.5, g: 10, o: 0.18, dauer: 80 },
  { x: 12.3, y: 12.4, g: 8, o: 0.2, dauer: 72 }, { x: 95.0, y: 45.5, g: 9, o: 0.22, dauer: 54 },
  { x: 10.6, y: 9.1, g: 7, o: 0.3, dauer: 66 }, { x: 95.9, y: 22.8, g: 6, o: 0.24, dauer: 71 },
  { x: 4.7, y: 89.3, g: 10, o: 0.31, dauer: 75 }, { x: 90.4, y: 19.9, g: 7, o: 0.2, dauer: 72 },
  { x: 10.4, y: 35.1, g: 9, o: 0.23, dauer: 59 }, { x: 92.0, y: 56.5, g: 4, o: 0.24, dauer: 71 },
  { x: 11.4, y: 32.1, g: 7, o: 0.21, dauer: 67 }, { x: 89.4, y: 96.7, g: 8, o: 0.3, dauer: 67 },
  { x: 4.3, y: 45.7, g: 6, o: 0.23, dauer: 71 }, { x: 94.9, y: 33.7, g: 10, o: 0.3, dauer: 81 },
  { x: 12.3, y: 84.3, g: 10, o: 0.3, dauer: 63 }, { x: 91.8, y: 64.6, g: 3, o: 0.33, dauer: 61 },
  { x: 0.6, y: 55.7, g: 5, o: 0.18, dauer: 76 }, { x: 96.9, y: 79.8, g: 7, o: 0.22, dauer: 52 },
  { x: 10.3, y: 63.4, g: 10, o: 0.31, dauer: 67 }, { x: 90.6, y: 77.6, g: 7, o: 0.25, dauer: 73 },
  { x: 1.5, y: 69.0, g: 8, o: 0.3, dauer: 56 }, { x: 88.4, y: 96.7, g: 7, o: 0.2, dauer: 60 },
  { x: 9.7, y: 8.7, g: 6, o: 0.29, dauer: 58 }, { x: 87.9, y: 27.2, g: 6, o: 0.17, dauer: 82 },
  { x: 13.4, y: 98.3, g: 7, o: 0.28, dauer: 71 }, { x: 90.8, y: 31.9, g: 7, o: 0.21, dauer: 70 },
  { x: 11.4, y: 4.0, g: 7, o: 0.18, dauer: 80 }, { x: 96.6, y: 25.5, g: 7, o: 0.2, dauer: 67 },
  { x: 7.2, y: 72.9, g: 5, o: 0.2, dauer: 53 }, { x: 96.7, y: 85.8, g: 10, o: 0.28, dauer: 69 },
  { x: 13.3, y: 61.4, g: 8, o: 0.34, dauer: 70 }, { x: 92.6, y: 65.8, g: 6, o: 0.19, dauer: 61 },
  { x: 10.4, y: 95.8, g: 8, o: 0.25, dauer: 74 }, { x: 94.4, y: 92.0, g: 5, o: 0.17, dauer: 65 },
  { x: 3.2, y: 50.7, g: 8, o: 0.18, dauer: 63 }, { x: 96.4, y: 27.2, g: 7, o: 0.18, dauer: 70 },
  { x: 5.2, y: 64.8, g: 8, o: 0.27, dauer: 62 }, { x: 88.4, y: 55.0, g: 4, o: 0.29, dauer: 58 },
  { x: 10.9, y: 79.5, g: 9, o: 0.17, dauer: 52 }, { x: 90.0, y: 30.0, g: 4, o: 0.19, dauer: 72 },
  { x: 2.2, y: 17.1, g: 3, o: 0.3, dauer: 59 }, { x: 91.7, y: 62.1, g: 8, o: 0.33, dauer: 69 },
  { x: 3.4, y: 36.5, g: 8, o: 0.18, dauer: 76 }, { x: 88.4, y: 32.5, g: 8, o: 0.17, dauer: 50 },
  { x: 1.3, y: 35.3, g: 5, o: 0.22, dauer: 51 }, { x: 88.5, y: 19.3, g: 4, o: 0.24, dauer: 77 },
  { x: 3.1, y: 83.7, g: 5, o: 0.2, dauer: 81 }, { x: 89.2, y: 16.1, g: 6, o: 0.29, dauer: 79 },
  { x: 11.6, y: 70.2, g: 5, o: 0.27, dauer: 78 }, { x: 98.2, y: 55.7, g: 7, o: 0.18, dauer: 63 },
  { x: 10.1, y: 11.9, g: 4, o: 0.22, dauer: 60 }, { x: 87.9, y: 20.6, g: 6, o: 0.19, dauer: 77 },
  { x: 0.9, y: 96.5, g: 10, o: 0.32, dauer: 67 }, { x: 90.1, y: 36.6, g: 3, o: 0.25, dauer: 79 },
  { x: 12.0, y: 83.6, g: 7, o: 0.34, dauer: 56 }, { x: 96.4, y: 55.8, g: 6, o: 0.24, dauer: 53 },
  { x: 12.6, y: 66.7, g: 6, o: 0.3, dauer: 55 }, { x: 92.3, y: 34.6, g: 8, o: 0.31, dauer: 56 },
  { x: 11.1, y: 29.8, g: 4, o: 0.27, dauer: 54 }, { x: 93.1, y: 45.2, g: 4, o: 0.23, dauer: 79 },
  { x: 8.5, y: 53.9, g: 4, o: 0.32, dauer: 58 }, { x: 86.8, y: 39.2, g: 4, o: 0.26, dauer: 66 },
  { x: 0.7, y: 5.0, g: 4, o: 0.3, dauer: 57 }, { x: 95.7, y: 85.2, g: 6, o: 0.29, dauer: 69 },
  { x: 13.0, y: 24.4, g: 7, o: 0.28, dauer: 75 }, { x: 89.5, y: 85.7, g: 6, o: 0.24, dauer: 81 },
  { x: 3.7, y: 18.6, g: 5, o: 0.3, dauer: 80 }, { x: 93.9, y: 48.2, g: 3, o: 0.25, dauer: 63 },
  { x: 5.5, y: 3.8, g: 7, o: 0.3, dauer: 68 }, { x: 89.5, y: 52.0, g: 5, o: 0.3, dauer: 51 },
  { x: 5.1, y: 86.5, g: 4, o: 0.33, dauer: 57 }, { x: 93.5, y: 80.2, g: 9, o: 0.17, dauer: 60 },
  { x: 6.4, y: 80.4, g: 4, o: 0.3, dauer: 76 }, { x: 91.5, y: 1.0, g: 5, o: 0.17, dauer: 60 },
  { x: 7.3, y: 90.7, g: 4, o: 0.21, dauer: 52 }, { x: 89.2, y: 83.8, g: 8, o: 0.18, dauer: 78 },
  { x: 7.6, y: 3.9, g: 7, o: 0.31, dauer: 82 }, { x: 94.4, y: 3.8, g: 5, o: 0.28, dauer: 80 },
  { x: 1.1, y: 9.4, g: 10, o: 0.17, dauer: 63 }, { x: 86.6, y: 61.6, g: 3, o: 0.24, dauer: 66 },
  { x: 1.4, y: 69.8, g: 8, o: 0.19, dauer: 65 }, { x: 92.7, y: 5.7, g: 6, o: 0.2, dauer: 75 },
];

// Gedrehte Quadrat-Umrisse — die Raute der Event-Kachel im Miniaturformat.
const RAUTEN: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 6.4, y: 24.6, g: 10, o: 0.27, dauer: 69 }, { x: 88.8, y: 66.8, g: 11, o: 0.23, dauer: 57 },
  { x: 7.4, y: 50.2, g: 12, o: 0.26, dauer: 72 }, { x: 94.2, y: 46.6, g: 10, o: 0.26, dauer: 75 },
  { x: 9.4, y: 96.6, g: 14, o: 0.34, dauer: 76 }, { x: 90.3, y: 80.8, g: 16, o: 0.31, dauer: 73 },
  { x: 9.9, y: 18.1, g: 14, o: 0.22, dauer: 52 }, { x: 95.7, y: 9.7, g: 15, o: 0.28, dauer: 65 },
  { x: 8.5, y: 34.0, g: 12, o: 0.21, dauer: 73 }, { x: 93.6, y: 64.4, g: 11, o: 0.22, dauer: 59 },
  { x: 11.4, y: 59.0, g: 14, o: 0.31, dauer: 70 }, { x: 89.7, y: 73.8, g: 10, o: 0.36, dauer: 62 },
  { x: 11.2, y: 18.1, g: 13, o: 0.29, dauer: 59 }, { x: 94.3, y: 74.2, g: 11, o: 0.3, dauer: 68 },
  { x: 11.3, y: 47.6, g: 10, o: 0.22, dauer: 71 }, { x: 93.0, y: 15.4, g: 12, o: 0.2, dauer: 71 },
  { x: 4.6, y: 15.7, g: 15, o: 0.3, dauer: 66 }, { x: 93.6, y: 10.4, g: 16, o: 0.25, dauer: 54 },
  { x: 10.4, y: 93.9, g: 13, o: 0.32, dauer: 75 }, { x: 96.9, y: 30.0, g: 13, o: 0.32, dauer: 65 },
  { x: 6.4, y: 84.9, g: 16, o: 0.23, dauer: 71 }, { x: 93.2, y: 20.9, g: 15, o: 0.25, dauer: 76 },
  { x: 11.9, y: 22.9, g: 15, o: 0.31, dauer: 57 }, { x: 95.6, y: 23.4, g: 11, o: 0.3, dauer: 72 },
  { x: 7.1, y: 21.2, g: 14, o: 0.25, dauer: 69 }, { x: 93.1, y: 37.9, g: 12, o: 0.26, dauer: 66 },
];

export function PixelStaub() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden min-[1560px]:block">
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
