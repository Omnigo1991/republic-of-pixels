import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// Typo-Karte, finales Design (Tim-Entscheid 09.08.2026 nach Varianten-
// Duell): V3 "Pixel-Klammern" mit der datierten Kicker-Zeile aus V10 —
// [ KATEGORIE // DATUM ]. Letzte Stufe der Bild-Hierarchie für starke
// Storys OHNE brauchbares Bildmaterial (Hardware/Branche/Personalien).
// Elemente: Cyan-Pixel-Klammern (zitieren die Pixel-Spur des R-Logos),
// Wasserzeichen-R mit Glow, Headline zentriert, R-Signatur unten.
// Bewusst OHNE Masthead-Schriftzug (Konsistenz) und in EINER Schrift
// (Inter — die Datums-Zeile trotz V10-Format nicht in Mono, Markenregel).
// 1080×1350, gerendert in 2× für scharfe Schriftkanten.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function headlineHtml(headlineLines) {
  return headlineLines
    .map((line) =>
      line
        .map((seg) =>
          seg.cyan
            ? `<span class="cy">${escapeHtml(seg.text)}</span>`
            : escapeHtml(seg.text)
        )
        .join(" ")
    )
    .join("<br>");
}

export async function renderTypoCard({ headlineLines, kicker, outPath, chromium }) {
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
  .glow { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:1800px; height:1800px; background:radial-gradient(circle, rgba(2,240,209,0.07) 0%, rgba(2,240,209,0) 62%); }
  .wasserzeichen { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:1500px; opacity:0.045; }
  .kicker { position:absolute; left:50%; top:37%; transform:translateX(-50%); font-weight:700; font-size:30px; letter-spacing:0.26em; color:rgba(255,255,255,0.4); white-space:nowrap; }
  .headline { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:1840px; text-align:center; font-weight:900; font-size:152px; line-height:1.16; letter-spacing:-0.015em; color:#fff; text-transform:uppercase; }
  .headline .cy { color:#02F0D1; }
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
  <img class="wasserzeichen" src="${logoUrl}" alt="">
  <div class="klammer-ol"></div><div class="pixel-ol-a"></div><div class="pixel-ol-b"></div>
  <div class="klammer-ur"></div><div class="pixel-ur-a"></div><div class="pixel-ur-b"></div>
  <div class="kicker">[ ${escapeHtml(kicker ?? "GAMING-NEWS")} // ${datum} ]</div>
  <div class="headline">${headlineHtml(headlineLines)}</div>
  <img class="logo" src="${logoUrl}" alt="">
</body>
</html>`;

  // Wie beim Karten-Renderer: HTML als Datei laden (setContent blockiert
  // file://-Bilder), Inter 900 kommt wie dort von Google Fonts.
  const htmlPath = join(tmpdir(), `rop-typo-${Date.now()}.html`);
  await writeFile(htmlPath, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 2160, height: 2700 } });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const shot = await page.screenshot({ type: "png" });
    await sharp(shot).resize(1080, 1350).jpeg({ quality: 90 }).toFile(outPath);
  } finally {
    await browser.close();
    await rm(htmlPath, { force: true });
  }
  return outPath;
}
