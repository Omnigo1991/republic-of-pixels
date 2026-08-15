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
// Grenzen: unter dem Inhalt (Text bleibt unberührt), pointer-events-none,
// feste Positionen in Prozent der Seitenhöhe (kein Zufall zur Laufzeit),
// Stillstand bei reduzierter Bewegung.
const PIXEL: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 60.8, y: 53.1, g: 6, o: 0.29, dauer: 60 }, { x: 76.4, y: 33.2, g: 9, o: 0.34, dauer: 69 },
  { x: 38.6, y: 69.3, g: 9, o: 0.35, dauer: 73 }, { x: 10.8, y: 81.5, g: 6, o: 0.36, dauer: 82 },
  { x: 68.9, y: 34.8, g: 6, o: 0.26, dauer: 69 }, { x: 65.4, y: 82.7, g: 8, o: 0.2, dauer: 65 },
  { x: 94.3, y: 79.1, g: 6, o: 0.32, dauer: 79 }, { x: 59.4, y: 79.9, g: 7, o: 0.19, dauer: 52 },
  { x: 7.1, y: 95.6, g: 8, o: 0.19, dauer: 51 }, { x: 62.5, y: 19.8, g: 5, o: 0.22, dauer: 70 },
  { x: 1.2, y: 93.1, g: 6, o: 0.27, dauer: 64 }, { x: 54.1, y: 77.1, g: 7, o: 0.33, dauer: 69 },
  { x: 83.6, y: 21.5, g: 4, o: 0.29, dauer: 61 }, { x: 76.4, y: 5.3, g: 7, o: 0.32, dauer: 79 },
  { x: 95.9, y: 2.7, g: 7, o: 0.28, dauer: 72 }, { x: 72.4, y: 79.3, g: 9, o: 0.23, dauer: 54 },
  { x: 69.8, y: 94.1, g: 4, o: 0.24, dauer: 55 }, { x: 18.9, y: 94.6, g: 5, o: 0.36, dauer: 59 },
  { x: 42.1, y: 60.3, g: 3, o: 0.27, dauer: 59 }, { x: 5.5, y: 46.0, g: 6, o: 0.19, dauer: 72 },
  { x: 64.7, y: 64.0, g: 5, o: 0.32, dauer: 62 }, { x: 13.4, y: 39.1, g: 6, o: 0.29, dauer: 60 },
  { x: 21.8, y: 98.4, g: 6, o: 0.26, dauer: 62 }, { x: 79.0, y: 95.1, g: 6, o: 0.37, dauer: 80 },
  { x: 61.3, y: 62.6, g: 3, o: 0.19, dauer: 62 }, { x: 63.2, y: 30.7, g: 7, o: 0.24, dauer: 75 },
  { x: 86.1, y: 22.6, g: 5, o: 0.36, dauer: 74 }, { x: 95.1, y: 37.9, g: 8, o: 0.34, dauer: 65 },
  { x: 38.0, y: 70.4, g: 7, o: 0.32, dauer: 71 }, { x: 8.4, y: 92.5, g: 7, o: 0.29, dauer: 74 },
  { x: 98.2, y: 4.0, g: 7, o: 0.3, dauer: 62 }, { x: 63.0, y: 11.6, g: 5, o: 0.24, dauer: 81 },
  { x: 77.9, y: 21.3, g: 7, o: 0.25, dauer: 67 }, { x: 57.1, y: 10.5, g: 9, o: 0.37, dauer: 82 },
  { x: 75.9, y: 66.8, g: 3, o: 0.31, dauer: 81 }, { x: 29.2, y: 15.0, g: 7, o: 0.38, dauer: 81 },
  { x: 91.7, y: 73.1, g: 3, o: 0.22, dauer: 62 }, { x: 16.0, y: 74.7, g: 9, o: 0.19, dauer: 78 },
  { x: 45.4, y: 80.0, g: 9, o: 0.24, dauer: 70 }, { x: 2.5, y: 42.5, g: 9, o: 0.2, dauer: 60 },
  { x: 8.0, y: 1.8, g: 5, o: 0.31, dauer: 62 }, { x: 15.5, y: 19.8, g: 4, o: 0.21, dauer: 75 },
  { x: 56.9, y: 24.6, g: 3, o: 0.27, dauer: 76 }, { x: 32.3, y: 54.9, g: 7, o: 0.33, dauer: 54 },
  { x: 7.3, y: 84.3, g: 9, o: 0.21, dauer: 67 }, { x: 57.2, y: 3.0, g: 9, o: 0.36, dauer: 65 },
  { x: 5.8, y: 54.8, g: 4, o: 0.35, dauer: 75 }, { x: 94.4, y: 52.0, g: 5, o: 0.21, dauer: 50 },
  { x: 83.3, y: 41.3, g: 7, o: 0.25, dauer: 70 }, { x: 1.3, y: 60.0, g: 4, o: 0.33, dauer: 53 },
  { x: 80.8, y: 37.3, g: 6, o: 0.3, dauer: 75 }, { x: 46.6, y: 1.5, g: 9, o: 0.35, dauer: 62 },
  { x: 7.2, y: 19.0, g: 7, o: 0.31, dauer: 60 }, { x: 41.2, y: 87.9, g: 4, o: 0.37, dauer: 82 },
  { x: 18.3, y: 2.3, g: 7, o: 0.29, dauer: 69 }, { x: 10.3, y: 91.8, g: 6, o: 0.24, dauer: 81 },
  { x: 36.1, y: 98.9, g: 3, o: 0.34, dauer: 71 }, { x: 90.0, y: 21.7, g: 7, o: 0.19, dauer: 53 },
  { x: 39.6, y: 52.6, g: 3, o: 0.34, dauer: 50 }, { x: 96.6, y: 4.3, g: 8, o: 0.37, dauer: 79 },
  { x: 8.1, y: 32.1, g: 7, o: 0.3, dauer: 82 }, { x: 94.2, y: 9.2, g: 8, o: 0.31, dauer: 73 },
  { x: 73.4, y: 3.5, g: 4, o: 0.2, dauer: 76 }, { x: 16.1, y: 20.2, g: 5, o: 0.26, dauer: 71 },
  { x: 6.9, y: 61.5, g: 4, o: 0.34, dauer: 80 }, { x: 26.5, y: 53.9, g: 4, o: 0.31, dauer: 67 },
  { x: 47.7, y: 15.3, g: 4, o: 0.33, dauer: 59 }, { x: 69.4, y: 16.4, g: 3, o: 0.31, dauer: 53 },
  { x: 23.4, y: 35.1, g: 5, o: 0.22, dauer: 54 }, { x: 72.0, y: 42.1, g: 7, o: 0.29, dauer: 74 },
  { x: 72.0, y: 40.3, g: 5, o: 0.34, dauer: 73 }, { x: 70.3, y: 93.7, g: 7, o: 0.38, dauer: 53 },
  { x: 71.3, y: 24.3, g: 5, o: 0.29, dauer: 68 }, { x: 31.9, y: 29.1, g: 3, o: 0.23, dauer: 70 },
  { x: 33.5, y: 9.1, g: 7, o: 0.33, dauer: 67 }, { x: 52.8, y: 3.7, g: 6, o: 0.36, dauer: 53 },
  { x: 92.1, y: 42.7, g: 7, o: 0.31, dauer: 71 }, { x: 16.7, y: 37.5, g: 7, o: 0.31, dauer: 78 },
  { x: 7.3, y: 19.1, g: 10, o: 0.29, dauer: 69 }, { x: 20.5, y: 52.3, g: 9, o: 0.3, dauer: 76 },
  { x: 55.4, y: 98.5, g: 8, o: 0.21, dauer: 74 }, { x: 73.5, y: 18.0, g: 5, o: 0.25, dauer: 66 },
  { x: 63.4, y: 27.1, g: 7, o: 0.23, dauer: 56 }, { x: 61.3, y: 13.2, g: 9, o: 0.26, dauer: 82 },
  { x: 12.0, y: 15.4, g: 6, o: 0.32, dauer: 72 }, { x: 65.9, y: 54.9, g: 5, o: 0.2, dauer: 74 },
  { x: 61.4, y: 45.6, g: 3, o: 0.2, dauer: 65 }, { x: 76.2, y: 23.2, g: 4, o: 0.32, dauer: 53 },
  { x: 89.4, y: 99.2, g: 8, o: 0.37, dauer: 51 }, { x: 56.4, y: 86.8, g: 4, o: 0.3, dauer: 71 },
  { x: 24.3, y: 59.1, g: 5, o: 0.37, dauer: 69 }, { x: 95.1, y: 39.4, g: 6, o: 0.32, dauer: 52 },
  { x: 52.4, y: 97.7, g: 6, o: 0.36, dauer: 77 }, { x: 41.7, y: 23.0, g: 9, o: 0.19, dauer: 50 },
  { x: 69.6, y: 51.5, g: 6, o: 0.23, dauer: 71 }, { x: 25.2, y: 17.8, g: 3, o: 0.29, dauer: 66 },
  { x: 30.9, y: 3.0, g: 5, o: 0.29, dauer: 80 }, { x: 38.7, y: 34.9, g: 3, o: 0.34, dauer: 82 },
  { x: 60.9, y: 57.8, g: 5, o: 0.35, dauer: 61 }, { x: 51.4, y: 2.9, g: 9, o: 0.33, dauer: 79 },
  { x: 39.8, y: 55.1, g: 3, o: 0.35, dauer: 80 }, { x: 62.7, y: 54.0, g: 7, o: 0.35, dauer: 67 },
  { x: 29.3, y: 16.5, g: 7, o: 0.29, dauer: 69 }, { x: 83.3, y: 53.8, g: 8, o: 0.38, dauer: 76 },
  { x: 42.8, y: 14.7, g: 9, o: 0.2, dauer: 74 }, { x: 33.8, y: 84.1, g: 7, o: 0.37, dauer: 64 },
  { x: 36.3, y: 17.1, g: 7, o: 0.36, dauer: 71 }, { x: 10.6, y: 31.2, g: 9, o: 0.19, dauer: 57 },
  { x: 21.1, y: 69.6, g: 5, o: 0.22, dauer: 77 }, { x: 57.5, y: 41.0, g: 4, o: 0.35, dauer: 52 },
  { x: 79.6, y: 14.0, g: 5, o: 0.29, dauer: 50 }, { x: 35.3, y: 88.7, g: 7, o: 0.28, dauer: 53 },
  { x: 19.7, y: 97.0, g: 6, o: 0.35, dauer: 58 }, { x: 33.4, y: 53.6, g: 5, o: 0.24, dauer: 79 },
  { x: 25.3, y: 10.7, g: 5, o: 0.2, dauer: 52 }, { x: 3.2, y: 20.4, g: 10, o: 0.24, dauer: 67 },
  { x: 8.4, y: 66.6, g: 5, o: 0.21, dauer: 60 }, { x: 9.5, y: 14.2, g: 10, o: 0.31, dauer: 54 },
  { x: 16.5, y: 26.7, g: 7, o: 0.26, dauer: 77 }, { x: 2.4, y: 68.9, g: 5, o: 0.35, dauer: 67 },
  { x: 49.1, y: 68.4, g: 5, o: 0.36, dauer: 74 }, { x: 11.6, y: 55.5, g: 7, o: 0.23, dauer: 61 },
  { x: 31.1, y: 52.2, g: 7, o: 0.35, dauer: 79 }, { x: 12.7, y: 74.1, g: 7, o: 0.32, dauer: 58 },
  { x: 50.6, y: 36.7, g: 3, o: 0.31, dauer: 70 }, { x: 47.8, y: 7.9, g: 7, o: 0.3, dauer: 69 },
  { x: 82.4, y: 76.7, g: 4, o: 0.35, dauer: 67 }, { x: 37.3, y: 55.7, g: 4, o: 0.35, dauer: 71 },
  { x: 23.8, y: 85.2, g: 7, o: 0.3, dauer: 73 }, { x: 44.3, y: 23.3, g: 9, o: 0.29, dauer: 80 },
  { x: 57.7, y: 23.2, g: 10, o: 0.23, dauer: 72 }, { x: 25.3, y: 20.5, g: 9, o: 0.24, dauer: 80 },
  { x: 65.3, y: 65.5, g: 3, o: 0.23, dauer: 68 }, { x: 66.6, y: 2.8, g: 7, o: 0.24, dauer: 57 },
  { x: 87.4, y: 71.2, g: 9, o: 0.21, dauer: 82 }, { x: 20.6, y: 79.5, g: 5, o: 0.32, dauer: 73 },
  { x: 40.5, y: 23.3, g: 5, o: 0.18, dauer: 72 }, { x: 97.3, y: 18.8, g: 7, o: 0.34, dauer: 71 },
  { x: 84.8, y: 70.6, g: 4, o: 0.36, dauer: 68 }, { x: 39.1, y: 3.9, g: 5, o: 0.28, dauer: 70 },
  { x: 79.0, y: 67.1, g: 10, o: 0.21, dauer: 69 }, { x: 61.3, y: 51.7, g: 7, o: 0.37, dauer: 76 },
  { x: 77.7, y: 72.5, g: 6, o: 0.27, dauer: 54 }, { x: 48.9, y: 71.5, g: 4, o: 0.28, dauer: 82 },
  { x: 33.9, y: 22.3, g: 6, o: 0.36, dauer: 56 }, { x: 86.0, y: 65.3, g: 4, o: 0.36, dauer: 63 },
  { x: 46.9, y: 76.8, g: 10, o: 0.38, dauer: 70 }, { x: 24.2, y: 78.2, g: 7, o: 0.2, dauer: 80 },
  { x: 22.3, y: 78.9, g: 3, o: 0.18, dauer: 56 }, { x: 34.9, y: 58.2, g: 5, o: 0.28, dauer: 66 },
  { x: 50.4, y: 40.4, g: 7, o: 0.21, dauer: 61 }, { x: 95.6, y: 1.6, g: 6, o: 0.29, dauer: 69 },
  { x: 1.9, y: 94.4, g: 7, o: 0.27, dauer: 72 }, { x: 54.3, y: 55.7, g: 10, o: 0.25, dauer: 70 },
  { x: 19.4, y: 72.2, g: 4, o: 0.23, dauer: 57 }, { x: 52.5, y: 95.9, g: 9, o: 0.37, dauer: 58 },
  { x: 97.6, y: 31.8, g: 3, o: 0.22, dauer: 76 }, { x: 72.8, y: 21.4, g: 9, o: 0.31, dauer: 57 },
  { x: 24.0, y: 22.2, g: 5, o: 0.3, dauer: 73 }, { x: 29.9, y: 78.7, g: 7, o: 0.24, dauer: 55 },
  { x: 84.7, y: 83.0, g: 6, o: 0.32, dauer: 55 }, { x: 62.8, y: 63.4, g: 7, o: 0.33, dauer: 73 },
  { x: 71.7, y: 62.2, g: 7, o: 0.27, dauer: 67 }, { x: 0.9, y: 0.5, g: 6, o: 0.23, dauer: 51 },
  { x: 47.1, y: 22.0, g: 5, o: 0.2, dauer: 59 }, { x: 29.6, y: 82.5, g: 4, o: 0.27, dauer: 76 },
  { x: 48.8, y: 3.1, g: 4, o: 0.35, dauer: 58 }, { x: 78.3, y: 1.8, g: 6, o: 0.19, dauer: 60 },
  { x: 69.9, y: 81.2, g: 4, o: 0.32, dauer: 65 }, { x: 27.1, y: 49.1, g: 7, o: 0.19, dauer: 67 },
  { x: 30.8, y: 70.4, g: 9, o: 0.36, dauer: 80 }, { x: 2.9, y: 59.8, g: 7, o: 0.33, dauer: 56 },
  { x: 25.4, y: 91.0, g: 9, o: 0.2, dauer: 68 }, { x: 71.5, y: 45.0, g: 9, o: 0.37, dauer: 52 },
  { x: 38.2, y: 20.5, g: 7, o: 0.38, dauer: 62 }, { x: 65.7, y: 3.9, g: 4, o: 0.23, dauer: 66 },
  { x: 25.5, y: 25.8, g: 4, o: 0.35, dauer: 62 }, { x: 43.6, y: 91.0, g: 4, o: 0.2, dauer: 56 },
  { x: 10.0, y: 46.5, g: 7, o: 0.26, dauer: 73 }, { x: 49.3, y: 90.2, g: 6, o: 0.19, dauer: 53 },
  { x: 38.2, y: 22.7, g: 6, o: 0.24, dauer: 66 }, { x: 78.5, y: 25.6, g: 5, o: 0.27, dauer: 61 },
  { x: 71.1, y: 51.0, g: 8, o: 0.21, dauer: 78 }, { x: 60.8, y: 3.7, g: 4, o: 0.29, dauer: 57 },
  { x: 57.8, y: 17.3, g: 4, o: 0.34, dauer: 74 }, { x: 79.0, y: 55.9, g: 7, o: 0.37, dauer: 64 },
  { x: 66.2, y: 94.5, g: 6, o: 0.37, dauer: 69 }, { x: 37.4, y: 18.5, g: 9, o: 0.25, dauer: 59 },
  { x: 97.8, y: 26.8, g: 5, o: 0.24, dauer: 71 }, { x: 13.4, y: 73.8, g: 9, o: 0.29, dauer: 79 },
  { x: 42.4, y: 7.2, g: 5, o: 0.22, dauer: 67 }, { x: 17.8, y: 27.9, g: 6, o: 0.22, dauer: 58 },
  { x: 98.0, y: 21.8, g: 4, o: 0.27, dauer: 78 }, { x: 62.5, y: 45.9, g: 3, o: 0.18, dauer: 78 },
  { x: 91.3, y: 27.3, g: 6, o: 0.36, dauer: 58 }, { x: 83.4, y: 94.4, g: 5, o: 0.22, dauer: 71 },
  { x: 12.5, y: 51.8, g: 10, o: 0.3, dauer: 68 }, { x: 65.1, y: 71.8, g: 7, o: 0.3, dauer: 73 },
  { x: 34.7, y: 26.4, g: 8, o: 0.31, dauer: 72 }, { x: 49.8, y: 82.9, g: 8, o: 0.3, dauer: 58 },
  { x: 60.1, y: 38.7, g: 4, o: 0.29, dauer: 65 }, { x: 10.5, y: 24.0, g: 8, o: 0.25, dauer: 72 },
  { x: 96.5, y: 95.4, g: 10, o: 0.22, dauer: 69 }, { x: 1.5, y: 70.0, g: 5, o: 0.35, dauer: 52 },
  { x: 34.7, y: 22.7, g: 8, o: 0.33, dauer: 66 }, { x: 28.2, y: 24.1, g: 5, o: 0.24, dauer: 55 },
  { x: 58.4, y: 53.0, g: 5, o: 0.19, dauer: 62 }, { x: 68.4, y: 93.7, g: 4, o: 0.33, dauer: 75 },
  { x: 4.1, y: 67.3, g: 4, o: 0.27, dauer: 61 }, { x: 67.0, y: 4.7, g: 6, o: 0.21, dauer: 51 },
  { x: 66.2, y: 44.7, g: 4, o: 0.29, dauer: 60 }, { x: 62.5, y: 26.7, g: 6, o: 0.33, dauer: 80 },
  { x: 18.1, y: 50.3, g: 7, o: 0.32, dauer: 59 }, { x: 57.4, y: 32.1, g: 3, o: 0.23, dauer: 54 },
  { x: 77.9, y: 30.2, g: 4, o: 0.2, dauer: 62 }, { x: 8.3, y: 32.0, g: 9, o: 0.2, dauer: 70 },
  { x: 79.3, y: 50.0, g: 5, o: 0.34, dauer: 56 }, { x: 43.3, y: 40.0, g: 4, o: 0.26, dauer: 54 },
  { x: 4.1, y: 48.1, g: 4, o: 0.19, dauer: 58 }, { x: 85.5, y: 75.4, g: 3, o: 0.38, dauer: 68 },
  { x: 33.7, y: 60.4, g: 8, o: 0.29, dauer: 62 }, { x: 14.3, y: 14.0, g: 4, o: 0.34, dauer: 60 },
  { x: 10.3, y: 61.1, g: 7, o: 0.34, dauer: 64 }, { x: 89.0, y: 16.1, g: 4, o: 0.35, dauer: 74 },
  { x: 38.3, y: 19.4, g: 4, o: 0.24, dauer: 50 }, { x: 56.8, y: 98.4, g: 10, o: 0.22, dauer: 73 },
  { x: 91.1, y: 83.7, g: 8, o: 0.26, dauer: 60 }, { x: 72.8, y: 85.6, g: 8, o: 0.26, dauer: 76 },
  { x: 80.3, y: 11.0, g: 5, o: 0.24, dauer: 56 }, { x: 12.5, y: 74.6, g: 7, o: 0.33, dauer: 76 },
  { x: 62.3, y: 32.0, g: 4, o: 0.35, dauer: 51 }, { x: 7.2, y: 20.4, g: 10, o: 0.38, dauer: 53 },
  { x: 57.2, y: 21.0, g: 7, o: 0.24, dauer: 62 }, { x: 68.2, y: 9.7, g: 5, o: 0.21, dauer: 54 },
  { x: 9.3, y: 2.1, g: 10, o: 0.35, dauer: 50 }, { x: 34.0, y: 64.6, g: 9, o: 0.37, dauer: 66 },
  { x: 55.4, y: 12.8, g: 8, o: 0.26, dauer: 54 }, { x: 43.5, y: 25.3, g: 5, o: 0.37, dauer: 61 },
  { x: 11.1, y: 50.2, g: 5, o: 0.21, dauer: 64 }, { x: 36.8, y: 74.9, g: 7, o: 0.32, dauer: 50 },
  { x: 69.9, y: 29.2, g: 5, o: 0.36, dauer: 57 }, { x: 26.5, y: 76.5, g: 8, o: 0.18, dauer: 56 },
  { x: 77.9, y: 35.3, g: 6, o: 0.27, dauer: 71 }, { x: 69.7, y: 53.2, g: 6, o: 0.33, dauer: 66 },
  { x: 30.7, y: 59.1, g: 9, o: 0.23, dauer: 59 }, { x: 74.3, y: 79.3, g: 4, o: 0.35, dauer: 72 },
  { x: 54.5, y: 32.4, g: 10, o: 0.28, dauer: 72 }, { x: 60.3, y: 92.5, g: 5, o: 0.33, dauer: 53 },
  { x: 60.3, y: 70.4, g: 10, o: 0.27, dauer: 81 }, { x: 75.2, y: 62.7, g: 3, o: 0.34, dauer: 70 },
  { x: 54.7, y: 91.3, g: 10, o: 0.21, dauer: 69 }, { x: 53.8, y: 50.3, g: 3, o: 0.29, dauer: 59 },
  { x: 79.2, y: 86.5, g: 5, o: 0.33, dauer: 75 }, { x: 51.8, y: 66.7, g: 5, o: 0.23, dauer: 79 },
  { x: 86.9, y: 66.6, g: 4, o: 0.28, dauer: 74 }, { x: 37.5, y: 4.2, g: 7, o: 0.24, dauer: 77 },
  { x: 93.3, y: 96.1, g: 5, o: 0.24, dauer: 51 }, { x: 18.3, y: 74.9, g: 5, o: 0.19, dauer: 65 },
  { x: 37.2, y: 92.5, g: 7, o: 0.23, dauer: 72 }, { x: 81.2, y: 0.6, g: 3, o: 0.37, dauer: 79 },
];

// Gedrehte Quadrat-Umrisse — die Raute der Event-Kachel im Miniaturformat.
const RAUTEN: { x: number; y: number; g: number; o: number; dauer: number }[] = [
  { x: 54.5, y: 31.2, g: 10, o: 0.24, dauer: 53 }, { x: 37.7, y: 67.4, g: 16, o: 0.39, dauer: 62 },
  { x: 9.5, y: 50.3, g: 14, o: 0.39, dauer: 67 }, { x: 79.8, y: 16.8, g: 10, o: 0.32, dauer: 55 },
  { x: 53.7, y: 92.6, g: 14, o: 0.33, dauer: 60 }, { x: 65.7, y: 66.0, g: 18, o: 0.27, dauer: 53 },
  { x: 78.1, y: 36.3, g: 18, o: 0.32, dauer: 57 }, { x: 65.1, y: 61.9, g: 11, o: 0.25, dauer: 66 },
  { x: 8.3, y: 64.5, g: 13, o: 0.4, dauer: 73 }, { x: 12.8, y: 35.1, g: 11, o: 0.39, dauer: 75 },
  { x: 73.4, y: 41.4, g: 11, o: 0.35, dauer: 72 }, { x: 42.4, y: 63.7, g: 14, o: 0.24, dauer: 76 },
  { x: 71.2, y: 92.1, g: 18, o: 0.37, dauer: 60 }, { x: 72.5, y: 40.6, g: 13, o: 0.39, dauer: 66 },
  { x: 37.4, y: 54.0, g: 11, o: 0.36, dauer: 60 }, { x: 11.7, y: 38.5, g: 11, o: 0.27, dauer: 67 },
  { x: 33.7, y: 89.4, g: 12, o: 0.25, dauer: 55 }, { x: 13.4, y: 8.5, g: 11, o: 0.37, dauer: 63 },
  { x: 7.1, y: 5.0, g: 11, o: 0.32, dauer: 73 }, { x: 10.8, y: 44.6, g: 13, o: 0.28, dauer: 56 },
  { x: 8.0, y: 68.5, g: 14, o: 0.23, dauer: 55 }, { x: 9.2, y: 19.5, g: 13, o: 0.31, dauer: 60 },
  { x: 62.3, y: 77.9, g: 16, o: 0.4, dauer: 53 }, { x: 3.3, y: 97.4, g: 13, o: 0.31, dauer: 56 },
  { x: 33.1, y: 61.4, g: 12, o: 0.24, dauer: 67 }, { x: 63.7, y: 74.8, g: 18, o: 0.36, dauer: 69 },
  { x: 60.6, y: 25.8, g: 16, o: 0.28, dauer: 75 }, { x: 6.9, y: 64.7, g: 11, o: 0.34, dauer: 54 },
  { x: 66.4, y: 11.5, g: 15, o: 0.27, dauer: 74 }, { x: 77.5, y: 52.8, g: 14, o: 0.31, dauer: 56 },
  { x: 6.8, y: 88.1, g: 14, o: 0.24, dauer: 60 }, { x: 43.8, y: 12.4, g: 18, o: 0.35, dauer: 69 },
  { x: 6.0, y: 43.3, g: 10, o: 0.36, dauer: 59 }, { x: 69.7, y: 46.3, g: 15, o: 0.23, dauer: 76 },
  { x: 55.0, y: 40.0, g: 12, o: 0.34, dauer: 72 }, { x: 94.4, y: 20.6, g: 13, o: 0.39, dauer: 52 },
  { x: 50.4, y: 5.2, g: 10, o: 0.3, dauer: 54 }, { x: 33.6, y: 6.2, g: 16, o: 0.37, dauer: 56 },
  { x: 32.7, y: 88.0, g: 15, o: 0.33, dauer: 76 }, { x: 49.7, y: 63.7, g: 14, o: 0.32, dauer: 62 },
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
