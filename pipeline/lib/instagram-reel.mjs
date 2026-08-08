import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Instagram-Reel-Renderer (Motion-Graphic, 08.08.2026): 1080×1350 (4:5), 5 s,
// 30 fps — Artikelbild mit langsamem Ken-Burns-Zoom, darüber ein statisches
// Overlay im Master-Template-Look (Verlauf ins Navy, Inter-900-Headline mit
// Cyan-Wörtern, Badge, R-Logo, Credit). Kein Trailer-/Gameplay-Material
// (Rechte!). ffmpeg kommt aus ffmpeg-static (identisch lokal und in CI);
// WICHTIG: execFileSync statt Shell — der Projektpfad enthält Leerzeichen
// und Klammern.
//
// Sicherheitszonen: Instagram legt im Reels-Feed unten ~420 px (Caption,
// Audio, Aktionen) und rechts ~120 px (Icon-Spalte) über das Video — alles
// Wichtige sitzt darum in der oberen Bildmitte mit grosszügigem Rand.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");

// 5 Sekunden (Tim-Entscheid 08.08.2026): Die Headline ist in 2–3 s gelesen;
// kurze Reels loopen im Feed → Abschlussrate über 100 % ist das stärkste
// Watch-Time-Signal für den Algorithmus. (Instagram-Minimum: 3 s.)
const DAUER_S = 5;
const FPS = 30;

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function headlineHtml(headlineLines) {
  return headlineLines
    .map((line) =>
      line
        .map((seg) => (seg.cyan ? `<span class="cy">${escapeHtml(seg.text)}</span>` : escapeHtml(seg.text)))
        .join(" ")
    )
    .join("<br>");
}

async function renderOverlay({ headlineLines, badge, credit, chromium, pngPath }) {
  const badgeHtml = badge ? `<div class="badge">${escapeHtml(badge)}</div>` : "";
  // 1:1 die Beitrags-Vorlage (Tim-Vorgabe 08.08.2026, Referenz: seine
  // manuellen Reels): Das Reel IST die animierte Beitrags-Karte — gleicher
  // 4:5-Canvas (1080×1350), gleiche Elemente, Grössen, Abstände und
  // Verlaufs-Stopps wie instagram-card.mjs. Instagram akzeptiert 4:5-Reels;
  // im Feed sind sie von Bild-Posts nicht zu unterscheiden, im Reels-Tab
  // laufen sie mit dunklen Rändern (genau wie Tims manuelle Reels).
  const G = 60;
  const LOGO_H = 60;
  const INK = 13.6;
  const HUB = 0;
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1350px; background:transparent; overflow:hidden; position:relative; }
  .grad { position:absolute; inset:0;
    background:linear-gradient(to bottom, rgba(12,11,26,0) 48%, rgba(12,11,26,0.62) 72%, rgba(12,11,26,0.96) 90%, #0C0B1A 100%); }
  .stapel { position:absolute; left:60px; right:60px; bottom:${(HUB + G + LOGO_H + G - INK).toFixed(1)}px;
    display:flex; flex-direction:column; align-items:center; gap:30px; }
  .titel { font-family:'Inter',sans-serif; font-weight:900; text-transform:uppercase;
    text-align:center; font-size:64px; line-height:1.18; letter-spacing:-0.015em;
    color:#FFFFFF; text-shadow:0 3px 18px rgba(0,0,0,0.5); }
  .titel .cy { color:#02F0D1; }
  .badge { border:3.5px solid #02F0D1; color:#02F0D1; font-family:'Inter',sans-serif;
    font-weight:900; font-size:28px; letter-spacing:0.22em; text-transform:uppercase;
    padding:12px 32px 11px 38px; border-radius:999px; background:rgba(12,11,26,0.55); }
  .logo { position:absolute; left:50%; transform:translateX(-50%); bottom:${HUB + G}px; height:${LOGO_H}px; }
  .label { position:absolute; left:40px; bottom:${HUB + 30}px; font-family:'Inter',sans-serif;
    font-weight:900; font-size:14px; letter-spacing:0.14em; text-transform:uppercase;
    color:rgba(255,255,255,0.32); }
</style></head><body>
  <div class="grad"></div>
  <div class="stapel">${badgeHtml}<div class="titel">${headlineHtml(headlineLines)}</div></div>
  <img class="logo" src="file://${LOGO}">
  <div class="label">${escapeHtml(credit || "KI-Symbolbild")}</div>
</body></html>`;

  const htmlFile = join(tmpdir(), `rop-reel-overlay-${Date.now()}.html`);
  await writeFile(htmlFile, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.goto(`file://${htmlFile}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: pngPath, omitBackground: true });
  } finally {
    await browser.close();
    await rm(htmlFile, { force: true });
  }
}

export async function renderInstagramReel({
  headlineLines,
  badge,
  imagePath, // 4:5-Portrait (bevorzugt) oder 16:9-Fallback
  credit,
  outPath, // .mp4
  chromium,
}) {
  const { default: ffmpegPath } = await import("ffmpeg-static");
  await mkdir(dirname(outPath), { recursive: true });
  const overlayPng = join(tmpdir(), `rop-reel-ov-${Date.now()}.png`);
  await renderOverlay({ headlineLines, badge, credit, chromium, pngPath: overlayPng });

  const frames = DAUER_S * FPS;
  // Ken-Burns: Bild deckend hochskalieren (Reserve für den Zoom), dann
  // langsamer zentrierter Zoom auf 1080×1350 — das 4:5-Format der Karte.
  const filter =
    `[0:v]scale=-2:1700,` +
    `zoompan=z='1+0.10*on/${frames}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=1080x1350:fps=${FPS}[bg];` +
    `[bg][1:v]overlay=0:0:format=auto,format=yuv420p[v]`;

  try {
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-loop", "1", "-i", imagePath,
        "-i", overlayPng,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-filter_complex", filter,
        "-map", "[v]", "-map", "2:a",
        "-t", String(DAUER_S),
        "-c:v", "libx264", "-preset", "medium", "-crf", "21",
        "-c:a", "aac", "-b:a", "64k", "-shortest",
        "-movflags", "+faststart",
        outPath,
      ],
      { stdio: "pipe" }
    );
  } finally {
    await rm(overlayPng, { force: true });
  }
}
