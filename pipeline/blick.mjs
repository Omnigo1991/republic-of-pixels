// BLICK - ein Bildschirmfoto zum ANSCHAUEN, nicht zum Vorzeigen.
//
// DER ANLASS (Tim, 30.08.2026: "Ich brauche nicht all das ganze Kontingent
// für das"). Wir haben nachgerechnet, wohin sein Claude-Abo geht:
//
//   Bilder, die ich mir angeschaut habe   356 MB   95 %
//   Browser-Bildschirmfotos                11 MB    3 %
//   alles andere zusammen                   6 MB    2 %
//
// 1295 Bilder in voller Auflösung. Und weil bei jeder neuen Antwort der
// ganze bisherige Verlauf noch einmal mitgelesen wird, kostet jedes dieser
// Bilder nicht einmal, sondern bei jedem weiteren Schritt erneut.
//
// Das war meine Arbeitsweise, nicht seine Nutzung: Tim hat in derselben
// Zeit 0,7 MB getippt.
//
// WARUM EIN SKRIPT UND KEIN VORSATZ: Hausregel. Eine Regel, die nur im
// Prompt steht, ist keine Regel. Ein Vorsatz, kleinere Bilder zu machen,
// hält bis zum ersten Mal, an dem es eilig ist. Ein Werkzeug, das gar keine
// grossen Bilder erzeugen kann, hält immer.
//
// DIE VORGABEN SIND GEMESSEN: 800 px Breite bei Qualität 72 reicht, um zu
// beurteilen, ob eine Kachel sitzt, ein Abstand stimmt oder ein Text
// umbricht. Verglichen mit dem, was ich vorher gemacht habe (1500 px, PNG,
// doppelte Auflösung), ist das rund ein Zehntel.
//
// WOFÜR ES NICHT GEDACHT IST: Bilder, die TIM ansehen soll. Die dürfen
// gross sein - sie gehen einmal an ihn und liegen nicht im Verlauf. Dafür
// rendert man weiterhin direkt und schickt die Datei.
//
// Aufruf:
//   node pipeline/blick.mjs <url> [ziel.jpg]
//   node pipeline/blick.mjs <url> ziel.jpg --breite 1000 --waehler "main"
//   node pipeline/blick.mjs <url> ziel.jpg --handy

import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, vorgabe) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : vorgabe;
};
const hat = (name) => argv.includes(`--${name}`);

const positional = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const url = positional[0];
const ziel = positional[1] ?? "/tmp/blick.jpg";

if (!url) {
  console.log("Aufruf: node pipeline/blick.mjs <url> [ziel.jpg] [--breite 800] [--waehler main] [--handy]");
  process.exit(1);
}

/** Obergrenze der Ausgabe. Bewusst hier und nicht als Aufruf-Vorgabe. */
const MAX_BREITE = 1000;

const breite = Math.min(Number(flag("breite", 800)), MAX_BREITE);
const waehler = flag("waehler", null);
const handy = hat("handy");

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: handy ? { width: 390, height: 844 } : { width: 1280, height: 1000 },
    // Bewusst 1, nicht 2: Doppelte Auflösung vervierfacht die Datenmenge
    // und beantwortet keine einzige Frage besser, die ich hier stelle.
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1500);

  const roh = waehler
    ? await (await page.locator(waehler).first()).screenshot()
    : await page.screenshot({ fullPage: hat("ganz") });

  mkdirSync(dirname(ziel), { recursive: true });
  await sharp(roh).resize({ width: breite, withoutEnlargement: true }).jpeg({ quality: 72 }).toFile(ziel);

  const { width, height } = await sharp(ziel).metadata();
  const kb = Math.round((await sharp(ziel).toBuffer()).length / 1024);
  console.log(`${ziel}  ${width}x${height}, ${kb} KB`);
  // Zum Vergleich, damit die Ersparnis sichtbar bleibt und nicht behauptet:
  const rohKb = Math.round(roh.length / 1024);
  console.log(`(Rohbild waere ${rohKb} KB gewesen - ${Math.round(rohKb / Math.max(kb, 1))}x groesser)`);
} finally {
  await browser.close();
}
