import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { entferneBalken } from "./letterbox.mjs";
import {
  besterAusschnitt,
  verlauf,
  headlineHtml as kartenHeadlineHtml,
  schriftEinpassenQuelle,
} from "./instagram-card.mjs";

// Instagram-Reel-Renderer (Motion-Graphic, 08.08.2026): 1080×1350 (4:5), 5 s,
// 30 fps - Artikelbild mit langsamem Ken-Burns-Zoom, darüber ein statisches
// Overlay im Master-Template-Look (Verlauf ins Navy, Inter-900-Headline mit
// Cyan-Wörtern, Badge, R-Logo, Credit). Kein Trailer-/Gameplay-Material
// (Rechte!). ffmpeg kommt aus ffmpeg-static (identisch lokal und in CI);
// WICHTIG: execFileSync statt Shell - der Projektpfad enthält Leerzeichen
// und Klammern.
//
// Sicherheitszonen: Instagram legt im Reels-Feed unten ~420 px (Caption,
// Audio, Aktionen) und rechts ~120 px (Icon-Spalte) über das Video - alles
// Wichtige sitzt darum in der oberen Bildmitte mit grosszügigem Rand.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");

// 5 Sekunden (Tim-Entscheid 08.08.2026): Die Headline ist in 2-3 s gelesen;
// kurze Reels loopen im Feed → Abschlussrate über 100 % ist das stärkste
// Watch-Time-Signal für den Algorithmus. (Instagram-Minimum: 3 s.)
const DAUER_S = 5;
const FPS = 30;

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// Eigene Fassung war ein Duplikat der Karten-Version und hatte deren
// Umbruch-Problem geerbt (Fund 11.08.2026 beim Nachbau der vier Posts): Die
// Sperre gegen heimliche Zeilenumbrüche galt nur für Bild-Posts, während
// rund die Hälfte unserer Beiträge Reels sind. Jetzt teilen sich beide
// Renderer dieselbe Ausgabe und dieselbe Einpassung.
const headlineHtml = kartenHeadlineHtml;

async function renderOverlay({ headlineLines, kicker, notiz, badge, credit, chromium, pngPath, grad }) {
  const badgeHtml = badge ? `<div class="badge">${escapeHtml(badge)}</div>` : "";
  const kickerHtml = kicker ? `<div class="kicker">${escapeHtml(kicker)}</div>` : "";
  const notizHtml = notiz ? `<div class="notiz">${escapeHtml(notiz)}</div>` : "";
  // 1:1 die Beitrags-Vorlage (Tim-Vorgabe 08.08.2026, Referenz: seine
  // manuellen Reels): Das Reel IST die animierte Beitrags-Karte - gleicher
  // 4:5-Canvas (1080×1350), gleiche Elemente, Grössen, Abstände und
  // Verlaufs-Stopps wie instagram-card.mjs. Instagram akzeptiert 4:5-Reels;
  // im Feed sind sie von Bild-Posts nicht zu unterscheiden, im Reels-Tab
  // laufen sie mit dunklen Rändern (genau wie Tims manuelle Reels).
  const G = 60;
  const LOGO_H = 60;
  const INK = 13.6;
  const HUB = 0;
  // Marker-Layout wie bei der Bild-Karte (13.08.2026) - Reel und Beitrag
  // müssen identisch aussehen, sonst zerfällt das Raster in zwei Stile.
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&family=Caveat:wght@700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1350px; background:transparent; overflow:hidden; position:relative; }
  /* ---- Cyberpunk (20.08.2026) ----
     Roehrenbild wie auf Bild- und Typo-Karte. Der Reel legt nur eine
     durchsichtige Textebene ueber das Video, deshalb liegt die Textur
     hier auf derselben Ebene und darf das Video nicht verdecken. */
  body::before { content:""; position:absolute; inset:0; z-index:1; pointer-events:none;
    background:repeating-linear-gradient(0deg, rgba(0,0,0,0.30) 0 2px, transparent 2px 6px);
    mix-blend-mode:multiply; opacity:0.45; }
  .stapel, .logo, .label { z-index:2; }
  .grad { position:absolute; inset:0; background:${grad}; }
  .stapel { position:absolute; left:${G}px; right:${G}px; bottom:${(HUB + G + LOGO_H + G - INK).toFixed(1)}px;
    display:flex; flex-direction:column; align-items:flex-start; text-align:left; }
  .badge { border:0; background:#0B0616; color:#02F0D1; font-family:'Inter',sans-serif;
    font-weight:900; font-size:24px; letter-spacing:0.22em; text-transform:uppercase;
    padding:10px 26px 9px 32px; border-radius:999px;
    margin-bottom:22px; }
  .kicker { font-family:'Inter',sans-serif; font-weight:900; font-size:26px;
    letter-spacing:0.20em; text-transform:uppercase; color:#02F0D1; margin-bottom:17px; }
  /* width:100% ist PFLICHT, nicht Kosmetik: In einem Flex-Stapel mit
     align-items:flex-start schrumpft ein Block-Kind auf seine Inhaltsbreite.
     Ohne diese Zeile mass die Einpassung die Zeile gegen sich selbst und
     war immer zufrieden - "DES SIRIUS-TEAMS" lief rechts aus dem Bild. */
  .titel { font-family:'Inter',sans-serif; font-weight:900; text-transform:uppercase;
    width:100%; text-align:left; font-size:75px; line-height:1.34; letter-spacing:-0.02em;
    color:#FFFFFF;
    text-shadow:-3px 0 rgba(255,46,151,0.75), 3px 0 rgba(2,240,209,0.75),
      0 3px 18px rgba(0,0,0,0.55); }
  .titel .zeile { display:block; white-space:nowrap; }
  .titel .cy { background:linear-gradient(100deg,#02F0D1,#FF2E97); color:#0B0616;
    padding:1px 9px 5px 9px; text-shadow:none; }
  .notiz { font-family:'Caveat',cursive; font-weight:700; font-size:47px; line-height:1.0;
    color:#02F0D1; margin-top:24px; transform:rotate(-2deg); transform-origin:left center; }
  .logo { position:absolute; left:50%; transform:translateX(-50%); bottom:${HUB + G}px; height:${LOGO_H}px; }
  .label { position:absolute; left:40px; bottom:${HUB + 30}px; font-family:'Inter',sans-serif;
    font-weight:900; font-size:14px; letter-spacing:0.14em; text-transform:uppercase;
    color:rgba(255,255,255,0.32); }
</style></head><body>
  <div class="grad"></div>
  <div class="stapel">${badgeHtml}${kickerHtml}<div class="titel">${headlineHtml(headlineLines)}</div>${notizHtml}</div>
  <img class="logo" src="file://${LOGO}">
  <div class="label">${escapeHtml(credit || "KI-Symbolbild")}</div>
</body></html>`;

  const htmlFile = join(tmpdir(), `rop-reel-overlay-${Date.now()}.html`);
  await writeFile(htmlFile, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
    // NICHT AUF "networkidle" WARTEN (Fund 13.08.2026): Der Abruf der
    // Google-Schriften laeuft gelegentlich in die 30-Sekunden-Grenze, und
    // Playwright wirft dann einen Fehler - in GitHub Actions kostet das den
    // ganzen Lauf. Zuverlaessiger und schneller: auf "load" warten und dann
    // gezielt darauf, dass die Schriften wirklich da sind. Das ist sogar
    // strenger, denn mit Ersatzschrift gemessene Breiten waeren falsch.
    await page.goto(`file://${htmlFile}`, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    // Gleiche Einpassung wie bei der Bild-Karte: keine Zeile bricht um,
    // stattdessen wird die Schrift verkleinert.
    await page.evaluate(`(${schriftEinpassenQuelle().toString()})(340, 1.0)`);
    await page.waitForTimeout(80);
    // Abstände angleichen wie bei der Bild-Karte: Kopfzeile→Schlagzeile soll
    // so gross wirken wie Schlagzeile→Notiz. Gemessen an der Tintenkante,
    // nicht am Element-Rechteck (Begründung in instagram-card.mjs).
    await page.evaluate(() => {
      const kicker = document.querySelector(".kicker");
      const titel = document.querySelector(".titel");
      const notiz = document.querySelector(".notiz");
      if (!kicker || !notiz || !titel) return;
      const zeilen = [...titel.querySelectorAll(".zeile")];
      if (!zeilen.length) return;
      const metrik = (el, text) => {
        const s = getComputedStyle(el);
        const ctx = new OffscreenCanvas(10, 10).getContext("2d");
        ctx.font = `${s.fontWeight} ${parseFloat(s.fontSize)}px ${s.fontFamily}`;
        const m = ctx.measureText(text || "X");
        const zh = parseFloat(s.lineHeight);
        const kasten = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
        const halbeLuft = Number.isFinite(zh) ? (zh - kasten) / 2 : 0;
        return {
          grundlinieAb: halbeLuft + m.fontBoundingBoxAscent,
          tinteOben: m.actualBoundingBoxAscent,
          tinteUnten: m.actualBoundingBoxDescent,
        };
      };
      const rechteck = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect();
      };
      const drehung = notiz.style.transform;
      notiz.style.transform = "none";
      const mK = metrik(kicker, kicker.textContent);
      const kickerUnten = rechteck(kicker).top + mK.grundlinieAb + mK.tinteUnten;
      const mE = metrik(titel, zeilen[0].textContent);
      const titelOben = rechteck(zeilen[0]).top + mE.grundlinieAb - mE.tinteOben;
      const letzte = zeilen[zeilen.length - 1];
      const mL = metrik(titel, letzte.textContent);
      let titelUnten = rechteck(letzte).top + mL.grundlinieAb + mL.tinteUnten;
      for (const k of titel.querySelectorAll(".cy")) {
        titelUnten = Math.max(titelUnten, k.getBoundingClientRect().bottom);
      }
      const mN = metrik(notiz, notiz.textContent);
      const notizOben = notiz.getBoundingClientRect().top + mN.grundlinieAb - mN.tinteOben;
      const jetzt = parseFloat(getComputedStyle(notiz).marginTop) || 0;
      notiz.style.marginTop = `${Math.round(jetzt + ((titelOben - kickerUnten) - (notizOben - titelUnten)))}px`;
      notiz.style.transform = drehung;
    });
    await page.waitForTimeout(80);
    await page.screenshot({ path: pngPath, omitBackground: true });
  } finally {
    await browser.close();
    await rm(htmlFile, { force: true });
  }
}

export async function renderInstagramReel({
  headlineLines,
  kicker, // Kopfzeile (Spiel/Studio/Hardware)
  notiz, // handschriftliche Reaktion
  badge,
  imagePath, // 4:5-Portrait (bevorzugt) oder 16:9-Fallback
  credit,
  outPath, // .mp4
  chromium,
}) {
  const { default: ffmpegPath } = await import("ffmpeg-static");
  await mkdir(dirname(outPath), { recursive: true });

  // Motiv-Sucher wie beim Standbild (09.08.2026): Reel und Beitrag eines
  // Artikels müssen denselben Ausschnitt und denselben Verlauf zeigen.
  // ffmpeg kann den Ausschnitt nicht selbst wählen, darum schneiden wir
  // das Bild vorher exakt auf 4:5 zu - der Ken-Burns-Zoom arbeitet dann
  // auf dem bereits richtig gelegten Fenster.
  // Schwarze Balken zuerst entfernen - Begründung in instagram-card.mjs.
  const balkenfrei = await entferneBalken(imagePath);
  if (balkenfrei.beschnitten) {
    console.log(`  Schwarze Balken entfernt (${JSON.stringify(balkenfrei.balken)})`);
  }
  imagePath = balkenfrei.pfad;

  const { positionX, positionY, luminanz, unruhe } = await besterAusschnitt(imagePath);
  const { width = 0, height = 0 } = await sharp(imagePath).metadata();
  const zuschnitt = join(tmpdir(), `rop-reel-bg-${Date.now()}.jpg`);
  if (width && height) {
    const skala = Math.max(1080 / width, 1350 / height);
    const fensterB = Math.min(width, Math.round(1080 / skala));
    const fensterH = Math.min(height, Math.round(1350 / skala));
    await sharp(imagePath)
      .extract({
        left: Math.round((width - fensterB) * (positionX / 100)),
        top: Math.round((height - fensterH) * (positionY / 100)),
        width: fensterB,
        height: fensterH,
      })
      .resize(1080, 1350, { fit: "fill" })
      .jpeg({ quality: 95 })
      .toFile(zuschnitt);
  } else {
    await sharp(imagePath).resize(1080, 1350, { fit: "cover" }).jpeg({ quality: 95 }).toFile(zuschnitt);
  }

  const overlayPng = join(tmpdir(), `rop-reel-ov-${Date.now()}.png`);
  await renderOverlay({
    headlineLines,
    kicker,
    notiz,
    badge,
    credit,
    chromium,
    pngPath: overlayPng,
    grad: verlauf(luminanz, unruhe),
  });

  const frames = DAUER_S * FPS;
  // Ken-Burns: Bild deckend hochskalieren (Reserve für den Zoom), dann
  // langsamer zentrierter Zoom auf 1080×1350 - das 4:5-Format der Karte.
  // Farbraum-Fix (09.08.2026, Tims Cyan-Beobachtung): Ohne explizite
  // Matrix wandelt swscale RGB nach der alten TV-Norm BT.601, Player
  // interpretieren 1080p aber als BT.709 - das verschob das Marken-Cyan
  // sichtbar. Jetzt: Umwandlung erzwungen nach BT.709 + Kennzeichnung im
  // Container, damit jeder Player identisch dekodiert.
  const filter =
    `[0:v]scale=1080:1350,` +
    `zoompan=z='1+0.10*on/${frames}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=1080x1350:fps=${FPS}[bg];` +
    `[bg][1:v]overlay=0:0:format=auto,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]`;

  try {
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-loop", "1", "-i", zuschnitt,
        "-i", overlayPng,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-filter_complex", filter,
        "-map", "[v]", "-map", "2:a",
        "-t", String(DAUER_S),
        "-c:v", "libx264", "-preset", "medium", "-crf", "21",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-c:a", "aac", "-b:a", "64k", "-shortest",
        "-movflags", "+faststart",
        outPath,
      ],
      { stdio: "pipe" }
    );
  } finally {
    await rm(overlayPng, { force: true });
    await rm(zuschnitt, { force: true });
  }
}
