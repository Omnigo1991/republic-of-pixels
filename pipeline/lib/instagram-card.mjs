import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Instagram-Post-Grafik nach dem Master-Template (Betreiber-Freigabe
// 07.08.2026, siehe auch Projektgedächtnis "instagram-master-template"):
// - 1080×1350 (4:5), gerendert in 2× und für scharfe Schriftkanten
//   heruntergerechnet
// - Vollflächiges Artikelbild, Verlauf ins Website-Navy #0C0B1A
// - Headline Inter 900, 64px, uppercase, Weiss mit max. 2 Cyan-Wörtern
// - Abstände Schrift-Tintenkante→Logo und Logo→Bildrand exakt 60px
//   (Tintenoffset wird im Browser per Canvas-Metrik gemessen)
// - Badge (BREAKING/REVIEW): Cyan-Umriss-Pill — bewusst EINE Bauart/Farbe
// - Credit-Label unten links: echter Bildnachweis der Quelle (unsere
//   Artikelbilder sind KEINE KI-Bilder — "KI-Symbolbild" nur als Fallback,
//   wenn kein Quellbild existiert)
// - Kontrast-Wächter: Ist der Bildbereich hinter der Headline hell, wird
//   der Verlauf verstärkt, damit Weiss/Cyan immer satt lesbar bleiben.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");
const G = 60;
const LOGO_H = 60;

// Helligkeit (0..1) des Bildbereichs, über dem die Headline liegt
// (unteres Drittel, horizontal mittig). Grundlage des Kontrast-Wächters.
async function headlineZoneLuminance(imagePath) {
  const { width, height } = await sharp(imagePath).metadata();
  const region = {
    left: Math.round(width * 0.1),
    top: Math.round(height * 0.6),
    width: Math.round(width * 0.8),
    height: Math.round(height * 0.32),
  };
  const stats = await sharp(imagePath).extract(region).stats();
  const [r, g, b] = stats.channels.map((c) => c.mean / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// headlineLines: Array von Zeilen; jede Zeile ist ein Array von Segmenten
// { text, cyan } — die Struktur kommt von Claude, das HTML bauen wir selbst.
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

export async function renderInstagramCard({
  headlineLines,
  badge, // null | "BREAKING" | "REVIEW"
  imagePath, // absoluter Pfad zum 4:5-Portrait (oder 16:9-Fallback)
  credit, // z. B. "Bild: GameSpot"; null → "KI-Symbolbild"
  outPath, // absoluter Zielpfad (.jpg)
  chromium, // playwright.chromium (injiziert, damit der Import zentral bleibt)
}) {
  const lum = await headlineZoneLuminance(imagePath);
  // Kontrast-Wächter: heller Hintergrund → Verlauf beginnt früher und
  // deckt stärker. Schwellwert empirisch (Testbilder 07.08.2026).
  const strong = lum > 0.45;
  const grad = strong
    ? "linear-gradient(to bottom, rgba(12,11,26,0) 40%, rgba(12,11,26,0.78) 66%, rgba(12,11,26,0.97) 88%, #0C0B1A 100%)"
    : "linear-gradient(to bottom, rgba(12,11,26,0) 48%, rgba(12,11,26,0.62) 72%, rgba(12,11,26,0.96) 90%, #0C0B1A 100%)";

  const badgeHtml = badge
    ? `<div class="badge">${escapeHtml(badge)}</div>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1350px; background:#0C0B1A; overflow:hidden; position:relative; }
  .bild { position:absolute; inset:0; }
  .bild img { width:100%; height:100%; object-fit:cover; display:block; }
  .bild::after { content:""; position:absolute; inset:0; background:${grad}; }
  .stapel { position:absolute; left:60px; right:60px; bottom:${G + LOGO_H + G}px;
    display:flex; flex-direction:column; align-items:center; gap:30px; }
  .titel { font-family:'Inter',sans-serif; font-weight:900; text-transform:uppercase;
    text-align:center; font-size:64px; line-height:1.18; letter-spacing:-0.015em;
    color:#FFFFFF; text-shadow:0 3px 18px rgba(0,0,0,0.5); }
  .titel .cy { color:#02F0D1; }
  .badge { border:3.5px solid #02F0D1; color:#02F0D1; font-family:'Inter',sans-serif;
    font-weight:900; font-size:28px; letter-spacing:0.22em; text-transform:uppercase;
    padding:12px 32px 11px 38px; border-radius:999px; background:rgba(12,11,26,0.55); }
  .logo { position:absolute; left:50%; transform:translateX(-50%); bottom:${G}px; height:${LOGO_H}px; }
  .label { position:absolute; left:40px; bottom:30px; font-family:'Inter',sans-serif;
    font-weight:900; font-size:14px; letter-spacing:0.14em; text-transform:uppercase;
    color:rgba(255,255,255,0.32); }
</style></head><body>
  <div class="bild"><img src="file://${imagePath}"></div>
  <div class="stapel">${badgeHtml}<div class="titel">${headlineHtml(headlineLines)}</div></div>
  <img class="logo" src="file://${LOGO}">
  <div class="label">${escapeHtml(credit || "KI-Symbolbild")}</div>
</body></html>`;

  // Als Datei laden statt setContent: nur mit file://-Seitenkontext darf
  // Chromium die file://-Bildressourcen (Artikelbild, Logo) mitladen.
  const htmlFile = join(tmpdir(), `rop-ig-card-${Date.now()}.html`);
  await writeFile(htmlFile, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 2,
    });
    await page.goto(`file://${htmlFile}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Tintenkompensation: Der optische Abstand Schriftkante→Logo muss den
    // Box-Abstand um den unsichtbaren Unterlängen-Raum korrigieren.
    await page.evaluate(({ G, LOGO_H }) => {
      const stapel = document.querySelector(".stapel");
      const titel = document.querySelector(".titel");
      const cs = getComputedStyle(titel);
      const fontPx = parseFloat(cs.fontSize);
      const lineBox = parseFloat(cs.lineHeight);
      const ctx = new OffscreenCanvas(10, 10).getContext("2d");
      ctx.font = `900 ${fontPx}px Inter`;
      const lastLine = titel.innerText.split("\n").pop() || "X";
      const m = ctx.measureText(lastLine.toUpperCase());
      const halfLeading =
        (lineBox - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
      const inkOffset =
        lineBox - (halfLeading + m.fontBoundingBoxAscent + m.actualBoundingBoxDescent);
      stapel.style.bottom = `${G + LOGO_H + G - inkOffset}px`;
    }, { G, LOGO_H });
    await page.waitForTimeout(100);

    const png = await page.screenshot();
    await mkdir(dirname(outPath), { recursive: true });
    // 2160×2700-Render → 1080×1350 herunterrechnen: Lanczos glättet die
    // Schriftkanten; Instagram skaliert ohnehin auf 1080 Breite.
    await sharp(png).resize(1080, 1350).jpeg({ quality: 88 }).toFile(outPath);
  } finally {
    await browser.close();
    await rm(htmlFile, { force: true });
  }
}
