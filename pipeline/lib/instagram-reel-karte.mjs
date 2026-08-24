import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { besterAusschnitt } from "./instagram-card.mjs";
import { entferneBalken } from "./letterbox.mjs";
import {
  kartenCss,
  kartenBody,
  zeilenAusHeadline,
  grosswortAusZeilen,
  einpassenQuelle,
  BREITE,
  HOEHE,
} from "./instagram-karte.mjs";

// REEL-RENDERER FÜR DIE NEUE VORLAGE (Tim-Freigabe 24.08.2026).
//
// Löst den alten Reel-Renderer ab, der noch die Cyberpunk-Karte trug -
// zwei Bildsprachen im selben Feed war der Grund, warum Reels seit dem
// 23.08. abgeschaltet waren (siehe instagram.mjs, REELS_AUS).
//
// Aufbau: Ken-Burns-Zoom auf das Motiv (5 s, 30 fps, wie beim alten
// Renderer), darüber ein STATISCHES Overlay im genau gleichen Aussehen wie
// die Standbild-Karte - Zeichen, Grosswort, Glaskarte, Chip, Schlagzeile.
// Das Overlay kommt aus denselben Bausteinen wie renderKarte
// (kartenCss/kartenBody/einpassenQuelle) - nur ohne die <img>-Bildebene,
// weil ffmpeg das bewegte Bild darunterlegt. So können Standbild und Reel
// nicht mehr auseinanderlaufen.
//
// Sicherheitszonen: Instagram legt im Reels-Feed unten ~420 px (Caption,
// Audio, Aktionen) und rechts ~120 px (Icon-Spalte) über das Video. Die
// Karte sitzt schon jetzt mit 56 px Rand unten und dem Zeichen bei 56 px
// rechts - das hält den vorhandenen Sicherheitsabstand der alten Vorlage
// ein, ohne dass hier etwas Neues geprüft werden musste.

const DAUER_S = 5;
const FPS = 30;

/** Rendert NUR das transparente Overlay (Zeichen, Grosswort, Karte). */
async function renderOverlay({ headlineLines, kicker, grosswort, chromium, pngPath }) {
  const zeilen = zeilenAusHeadline(headlineLines);
  const wort = grosswort || grosswortAusZeilen(headlineLines, kicker);

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>${kartenCss({ mitBildEbene: false, positionX: 50, positionY: 50 })}</style></head><body>${kartenBody({ mitBildEbene: false, bild: null, wort, kicker, zeilen })}
</body></html>`;

  const htmlDatei = join(tmpdir(), `rop-reel-ov-${Date.now()}.html`);
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
      console.log("::warning::Reel-Overlay: Inter nicht geladen - laeuft in Ersatzschrift");
    }
    const mass = await page.evaluate(`(${einpassenQuelle().toString()})()`);
    if (!mass.passt) {
      console.log(
        `  Hinweis: Reel-Vorlage eng - Wort ${mass.wortgroesse}px bis ${mass.wortBis} von ${mass.platz}px, Schlagzeile ${mass.titelgroesse}px`,
      );
    }
    await page.waitForTimeout(120);
    // omitBackground: der leere Bildbereich bleibt durchsichtig, damit
    // ffmpeg das bewegte Motiv darunterlegen kann.
    const png = await page.screenshot({ omitBackground: true });
    await sharp(png).resize(BREITE, HOEHE).toFile(pngPath);
    return { grosswort: wort, ...mass };
  } finally {
    await browser.close();
    await rm(htmlDatei, { force: true });
  }
}

/**
 * Rendert das neue Post-Reel: Ken-Burns-Video mit der Standbild-Karte als
 * Overlay.
 *
 * @param {object}   o
 * @param {string[][]|string[]} o.headlineLines
 * @param {string}   o.kicker
 * @param {string}  [o.grosswort]
 * @param {string}   o.imagePath
 * @param {string}   o.outPath   .mp4
 * @param {object}   o.chromium
 */
export async function renderReelKarte({
  headlineLines,
  kicker,
  grosswort,
  imagePath,
  outPath,
  chromium,
}) {
  const { default: ffmpegPath } = await import("ffmpeg-static");
  await mkdir(dirname(outPath), { recursive: true });

  // Schwarze Balken zuerst entfernen (Begruendung: instagram-karte.mjs).
  const balkenfrei = await entferneBalken(imagePath);
  if (balkenfrei.beschnitten) {
    console.log(`  Schwarze Balken entfernt (${JSON.stringify(balkenfrei.balken)})`);
  }
  const bild = balkenfrei.pfad;

  // ffmpeg kann den Ausschnitt nicht selbst waehlen - das Motiv wird darum
  // vorab exakt auf 4:5 zugeschnitten, mit demselben Ausschnittsucher wie
  // die Karte. Der Ken-Burns-Zoom arbeitet danach auf dem richtig gelegten
  // Fenster.
  const { positionX, positionY } = await besterAusschnitt(bild);
  const { width = 0, height = 0 } = await sharp(bild).metadata();
  const zuschnitt = join(tmpdir(), `rop-reel-bg-${Date.now()}.jpg`);
  if (width && height) {
    const skala = Math.max(BREITE / width, HOEHE / height);
    const fensterB = Math.min(width, Math.round(BREITE / skala));
    const fensterH = Math.min(height, Math.round(HOEHE / skala));
    await sharp(bild)
      .extract({
        left: Math.round((width - fensterB) * (positionX / 100)),
        top: Math.round((height - fensterH) * (positionY / 100)),
        width: fensterB,
        height: fensterH,
      })
      .resize(BREITE, HOEHE, { fit: "fill" })
      .jpeg({ quality: 95 })
      .toFile(zuschnitt);
  } else {
    await sharp(bild).resize(BREITE, HOEHE, { fit: "cover" }).jpeg({ quality: 95 }).toFile(zuschnitt);
  }

  const overlayPng = join(tmpdir(), `rop-reel-ov-${Date.now()}.png`);
  const mass = await renderOverlay({ headlineLines, kicker, grosswort, chromium, pngPath: overlayPng });

  const frames = DAUER_S * FPS;
  // Ken-Burns + Farbraum-Fix (aus dem alten Renderer uebernommen, Fund
  // 09.08.2026): ohne die BT.709-Erzwingung verschiebt swscale das
  // Marken-Cyan sichtbar.
  const filter =
    `[0:v]scale=${BREITE}:${HOEHE},` +
    `zoompan=z='1+0.10*on/${frames}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${BREITE}x${HOEHE}:fps=${FPS}[bg];` +
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
      { stdio: "pipe" },
    );
  } finally {
    await rm(overlayPng, { force: true });
    await rm(zuschnitt, { force: true });
  }

  return mass;
}
