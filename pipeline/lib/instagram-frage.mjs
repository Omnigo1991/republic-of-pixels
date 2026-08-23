import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// FRAGEN-KARTE (Tim, 12.08.2026) - das zweite Format unseres Kanals.
//
// Sie borgt sich die Bildsprache der Typo-Karte (Navy, Cyan-Pixel-Klammern,
// mittig gesetzte Schrift), unterscheidet sich im Feed aber auf einen Blick:
// ein grosses Fragezeichen als Wasserzeichen statt des R. Genau das ist der
// Zweck - wer durch unser Raster scrollt, soll sofort sehen, dass hier
// keine Nachricht steht, sondern eine Frage an ihn. Das R bleibt als
// Signatur unten, die Marke geht also nicht verloren.
//
// 1080×1350, gerendert in 2× fuer scharfe Schriftkanten (wie Typo-Karte).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function frageHtml(frageLines) {
  // Jede Zeile nowrap - nie heimlich umbrechen, stattdessen verkleinern.
  // Gleiche Regel wie bei Bild- und Typo-Karte.
  return frageLines
    .map(
      (line) =>
        `<span class="zeile">${line
          .map((seg) =>
            seg.cyan
              ? `<span class="cy">${escapeHtml(seg.text)}</span>`
              : escapeHtml(seg.text),
          )
          .join(" ")}</span>`,
    )
    .join("");
}

export async function renderFrageCard({ frageLines, outPath, chromium }) {
  await mkdir(dirname(outPath), { recursive: true });
  const logoUrl = pathToFileURL(LOGO).href;
  const datum = new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:2160px; height:2700px; background:#0C0B1A; font-family:'Inter',-apple-system,sans-serif; position:relative; overflow:hidden; }
  .glow { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:1800px; height:1800px;
    background:radial-gradient(circle, rgba(2,240,209,0.09) 0%, rgba(2,240,209,0) 62%); }
  /* Das Fragezeichen ist das Erkennungsmerkmal des Formats. Bewusst sehr
     zurueckhaltend (6 %) - es soll den Blick fuehren, nicht mit der Schrift
     um Aufmerksamkeit kaempfen. */
  .fragezeichen { position:absolute; left:50%; top:48%; transform:translate(-50%,-50%);
    font-weight:900; font-size:1750px; line-height:1; color:#02F0D1; opacity:0.06; }
  .satz { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    width:1840px; display:flex; flex-direction:column; align-items:center; gap:64px; }
  .kicker { font-weight:700; font-size:30px; letter-spacing:0.26em; color:rgba(255,255,255,0.4); white-space:nowrap; }
  .frage { width:100%; text-align:center; font-weight:900; font-size:152px; line-height:1.16;
    letter-spacing:-0.015em; color:#fff; text-transform:uppercase; }
  .frage .zeile { display:block; white-space:nowrap; }
  .frage .cy { color:#02F0D1; }
  /* Die Aufforderung steht im Stapel, nicht frei positioniert - damit kann
     sie die Frage baulich nicht ueberschreiben (Lehre aus der Typo-Karte,
     11.08.2026). */
  .cta { font-weight:900; font-size:38px; letter-spacing:0.20em; color:#02F0D1; white-space:nowrap; }
  .klammer-ol { position:absolute; left:200px; top:600px; width:200px; height:200px; border-left:36px solid #02F0D1; border-top:36px solid #02F0D1; }
  .pixel-ol-a { position:absolute; left:460px; top:564px; width:52px; height:52px; background:#02F0D1; }
  .pixel-ol-b { position:absolute; left:548px; top:636px; width:28px; height:28px; background:#02F0D1; opacity:0.6; }
  .klammer-ur { position:absolute; right:200px; bottom:540px; width:200px; height:200px; border-right:36px solid #02F0D1; border-bottom:36px solid #02F0D1; }
  .pixel-ur-a { position:absolute; right:460px; bottom:504px; width:52px; height:52px; background:#02F0D1; }
  .pixel-ur-b { position:absolute; right:548px; bottom:576px; width:28px; height:28px; background:#02F0D1; opacity:0.6; }
  .logo { position:absolute; left:50%; bottom:120px; transform:translateX(-50%); height:120px; }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="fragezeichen">?</div>
  <div class="klammer-ol"></div><div class="pixel-ol-a"></div><div class="pixel-ol-b"></div>
  <div class="klammer-ur"></div><div class="pixel-ur-a"></div><div class="pixel-ur-b"></div>
  <div class="satz">
    <div class="kicker">[ FRAGE AN EUCH // ${datum} ]</div>
    <div class="frage">${frageHtml(frageLines)}</div>
    <div class="cta">ANTWORTET IN DEN KOMMENTAREN</div>
  </div>
  <img class="logo" src="${logoUrl}" alt="">
</body>
</html>`;

  const htmlPath = join(tmpdir(), `rop-frage-${Date.now()}.html`);
  await writeFile(htmlPath, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 2160, height: 2700 } });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const einpassung = await page.evaluate(() => {
      const titel = document.querySelector(".frage");
      const zeilen = [...titel.querySelectorAll(".zeile")];
      const breite = titel.clientWidth * 0.9;
      let groesse = parseFloat(getComputedStyle(titel).fontSize);
      // Textbreite per Range messen - scrollWidth liefert bei einem
      // Block-Element die Container-Breite (Fund 11.08.2026).
      const textBreite = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().width;
      };
      // Hoehendeckel 700 px (im 2×-Raster, also 350 px auf der fertigen
      // Karte): Damit bleibt der ganze Stapel aus Kopfzeile, Frage und
      // Aufforderung im Suchfenster der Abnahme (30-72 %) - drei Zeilen
      // messen gemessene 265 px, der Deckel laesst also Reserve, schliesst
      // aber aus, dass ein ueberlanger Block in die Cyan-Klammern laeuft.
      const passt = () =>
        zeilen.every((z) => textBreite(z) <= breite + 0.5) &&
        titel.getBoundingClientRect().height <= 700;
      while (!passt() && groesse > 88) {
        groesse -= 2;
        titel.style.fontSize = `${groesse}px`;
      }
      return { groesse, passt: passt() };
    });
    if (!einpassung.passt) {
      console.log(`  Hinweis: Frage passt auch bei ${einpassung.groesse}px nicht ganz`);
    }
    await page.waitForTimeout(80);
    const shot = await page.screenshot({ type: "png" });
    await sharp(shot).resize(1080, 1350).jpeg({ quality: 90 }).toFile(outPath);
  } finally {
    await browser.close();
    await rm(htmlPath, { force: true });
  }
  return outPath;
}
