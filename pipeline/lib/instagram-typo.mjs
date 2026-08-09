import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// Typo-Karte (Tim-Freigabe 09.08.2026, Skizze VORSCHAU-typo-karte):
// Letzte Stufe der Bild-Hierarchie für starke Storys OHNE brauchbares
// Bildmaterial (Hardware-, Branchen-, Personalien-News ohne Spiel).
// Reines Marken-Design statt Foto — bewusst OHNE Masthead-Schriftzug
// (Konsistenz-Entscheid: gleiche Anatomie wie jeder Post — Kicker,
// Headline, Cyan-Strich, R-Signatur; die Markenpräsenz liefert das
// Wasserzeichen-R, der Accountname steht auf Instagram ohnehin darüber).
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
  .kicker { position:absolute; left:50%; top:37%; transform:translateX(-50%); font-weight:700; font-size:30px; letter-spacing:0.34em; color:rgba(255,255,255,0.4); white-space:nowrap; }
  .headline { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:1840px; text-align:center; font-weight:900; font-size:152px; line-height:1.16; letter-spacing:-0.015em; color:#fff; text-transform:uppercase; }
  .headline .cy { color:#02F0D1; }
  .strich { position:absolute; left:50%; top:64.5%; transform:translateX(-50%); width:140px; height:8px; border-radius:99px; background:#02F0D1; }
  .logo { position:absolute; left:50%; bottom:120px; transform:translateX(-50%); height:120px; }
</style>
</head>
<body>
  <div class="glow"></div>
  <img class="wasserzeichen" src="${logoUrl}" alt="">
  <div class="kicker">${escapeHtml(kicker ?? "GAMING-NEWS")}</div>
  <div class="headline">${headlineHtml(headlineLines)}</div>
  <div class="strich"></div>
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
