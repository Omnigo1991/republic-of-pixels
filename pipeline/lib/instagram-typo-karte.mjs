import { writeFile, mkdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  kartenCss,
  kartenBody,
  zeilenAusHeadline,
  grosswortAusZeilen,
  einpassenQuelle,
  BREITE,
  HOEHE,
} from "./instagram-karte.mjs";

// TYPO-KARTE - AKTUELL NICHT EINGEHAENGT (Stand 24.08.2026).
//
// Diese Datei rendert eine Post-Grafik ohne Foto: Markengrund statt Bild,
// darauf dieselbe Glaskarte wie die Bild-Karte. Sie ersetzte das alte
// instagram-typo.mjs mit seiner Cyberpunk-Optik.
//
// Tim hat sich am 24.08.2026 gegen Typo-Karten entschieden. Der Aufruf ist
// aus pipeline/instagram.mjs entfernt; eine Story ohne taugliches Bild
// wird jetzt uebersprungen. Die Zahlen dazu: 5 von 71 Posts waren
// Typo-Karten (7 %), in den letzten elf Tagen genau einer.
//
// Die Datei bleibt liegen, weil die Entscheidung eine Geschmacks- und
// keine Sachfrage war - zurueckdrehen kostet einen Import und einen
// Aufruf. Aufbau, Schrift und Glaskarte kommen aus denselben Bausteinen
// wie die Bild-Karte (kartenCss/kartenBody/einpassenQuelle), sie kann also
// nicht von der Hauptvorlage abdriften.

const HIER = dirname(new URL(import.meta.url).pathname);
const LOGO = join(HIER, "..", "..", "public", "brand", "r-mark.png");

// Vier Gründe stehen zur Wahl - alle aus demselben Markenmaterial gebaut
// (Navy, Cyan #02F0D1, Magenta #FF2E97, Pixel-Zeichen, 28px-Raster). Der
// Grund ist bewusst umschaltbar: Wenn Tim später einen anderen will, ist
// das eine Zeile und keine neue Karte.
export const GRUENDE = ["schein", "zeichen", "pixel", "band"];

function grundCss(grund) {
  const scheine = `
  .schein-cyan { position:absolute; left:-260px; top:-300px; width:1100px; height:1100px;
    border-radius:50%;
    background:radial-gradient(circle, rgba(2,240,209,0.30) 0%, rgba(2,240,209,0) 66%); }
  .schein-magenta { position:absolute; right:-280px; top:120px; width:1150px; height:1150px;
    border-radius:50%;
    background:radial-gradient(circle, rgba(255,46,151,0.26) 0%, rgba(255,46,151,0) 66%); }`;
  const raster = (weite, deckung) => `
  .raster { position:absolute; inset:0; opacity:${deckung};
    background-image:
      linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px);
    background-size:${weite}px ${weite}px; }`;

  if (grund === "zeichen") {
    // Das Pixel-R gross und leise im Hintergrund - dieselbe Marke wie oben
    // rechts, nur als Fläche. Deckung 0.13, damit die Schrift führt.
    return scheine + `
  .wasserzeichen { position:absolute; right:-90px; top:130px; height:720px; opacity:0.13; }`;
  }
  if (grund === "pixel") {
    // Pixelfeld nach fester Regel: Dichte fällt von der Mitte nach aussen
    // ab, gefärbt entlang des Markenverlaufs. Fester Startwert, damit
    // dieselbe Meldung immer dasselbe Bild ergibt - kein Zufall im Post.
    return `
  .schein-mitte { position:absolute; left:50%; top:180px; transform:translateX(-50%);
    width:1200px; height:900px; border-radius:50%;
    background:radial-gradient(ellipse, rgba(2,240,209,0.22) 0%, rgba(255,46,151,0.16) 42%, transparent 70%); }
  /* Weiche Kante: Ohne Maske endet das Feld als sichtbare Gerade. */
  .pixel { position:absolute; inset:0;
    -webkit-mask-image:radial-gradient(ellipse 62% 46% at 50% 30%, black 34%, transparent 100%);
    mask-image:radial-gradient(ellipse 62% 46% at 50% 30%, black 34%, transparent 100%); }
  .pixel b { position:absolute; display:block; }`;
  }
  if (grund === "band") {
    return `
  .band { position:absolute; left:0; right:0; top:250px; height:340px;
    background:linear-gradient(100deg, rgba(2,240,209,0.20), rgba(255,46,151,0.20));
    filter:blur(60px); }` + raster(36, 0.06) + `
  .raster { -webkit-mask-image:radial-gradient(ellipse 70% 50% at 50% 34%, black, transparent 76%);
    mask-image:radial-gradient(ellipse 70% 50% at 50% 34%, black, transparent 76%); }`;
  }
  return scheine + raster(28, 0.05);
}

function grundBody(grund) {
  if (grund === "zeichen") {
    return `<div class="schein-cyan"></div><div class="schein-magenta"></div>
    <img class="wasserzeichen" src="file://${LOGO}">`;
  }
  if (grund === "pixel") return `<div class="schein-mitte"></div><div class="pixel" id="pixelfeld"></div>`;
  if (grund === "band") return `<div class="band"></div><div class="raster"></div>`;
  return `<div class="schein-cyan"></div><div class="schein-magenta"></div><div class="raster"></div>`;
}

const PIXEL_SKRIPT = `<script>
  const feld = document.getElementById("pixelfeld");
  if (feld) {
    let s = 20260824;                       // fester Startwert, kein Zufall
    const zz = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    const M = 18;
    for (let y = 0; y < 900; y += M * 2) for (let x = 0; x < 1080; x += M * 2) {
      const dx = (x - 540) / 540, dy = (y - 380) / 380;
      const rand = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      if (zz() > rand * 0.5) continue;      // Mitte bleibt frei fuer die Schrift
      const b = document.createElement("b");
      b.style.width = M + "px"; b.style.height = M + "px";
      b.style.left = x + "px"; b.style.top = y + "px";
      const t = x / 1080;                   // Farbe entlang des Markenverlaufs
      b.style.background = "rgb(" + Math.round(2 + 253 * t) + "," +
        Math.round(240 - 194 * t) + "," + Math.round(209 - 58 * t) + ")";
      b.style.opacity = (0.10 + rand * 0.22).toFixed(2);
      feld.appendChild(b);
    }
  }
</script>`;

/**
 * Rendert die Typo-Karte: neue Vorlage, Markengrund statt Foto.
 *
 * @param {object}   o
 * @param {string[][]|string[]} o.headlineLines
 * @param {string}   o.kicker
 * @param {string}  [o.grosswort]
 * @param {string}  [o.grund]  "schein" | "zeichen" | "pixel" | "band"
 * @param {string}   o.outPath  .jpg
 * @param {object}   o.chromium
 */
export async function renderTypoKarte({
  headlineLines,
  kicker,
  grosswort,
  grund = "schein",
  outPath,
  chromium,
}) {
  const zeilen = zeilenAusHeadline(headlineLines);
  const wort = grosswort || grosswortAusZeilen(headlineLines, kicker);

  // mitBildEbene: false liefert die Karte ohne <img> und mit
  // durchsichtigem Grund - den Grund legen wir hier selbst darunter.
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>${kartenCss({ mitBildEbene: false, positionX: 50, positionY: 50 })}
  body { background:#0C0B1A; }
${grundCss(grund)}</style></head><body>
  <div class="grund">${grundBody(grund)}</div>
${kartenBody({ mitBildEbene: false, bild: null, wort, kicker, zeilen })}
${grund === "pixel" ? PIXEL_SKRIPT : ""}
</body></html>`;

  const htmlDatei = join(tmpdir(), `rop-typo-${Date.now()}.html`);
  await writeFile(htmlDatei, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: BREITE, height: HOEHE },
      deviceScaleFactor: 2,
    });
    await page.goto(`file://${htmlDatei}`, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    if (!(await page.evaluate(() => document.fonts.check("900 40px Inter")))) {
      console.log("::warning::Typo-Karte: Inter nicht geladen - laeuft in Ersatzschrift");
    }
    const mass = await page.evaluate(`(${einpassenQuelle().toString()})()`);
    if (!mass.passt) {
      console.log(
        `  Hinweis: Typo-Karte eng - Wort ${mass.wortgroesse}px bis ${mass.wortBis} von ${mass.platz}px, Schlagzeile ${mass.titelgroesse}px`,
      );
    }
    await page.waitForTimeout(120);
    const png = await page.screenshot();
    await mkdir(dirname(outPath), { recursive: true });
    await sharp(png).resize(BREITE, HOEHE).jpeg({ quality: 90 }).toFile(outPath);
    return { grosswort: wort, ...mass };
  } finally {
    await browser.close();
    await rm(htmlDatei, { force: true });
  }
}

export { LOGO };
