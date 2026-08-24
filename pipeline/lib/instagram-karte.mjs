import { writeFile, mkdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { besterAusschnitt } from "./instagram-card.mjs";
import { entferneBalken } from "./letterbox.mjs";

// DIE NEUE POST-VORLAGE (Tim-Freigabe 23.08.2026, Fassung "Grosswort + A").
//
// Warum sie die alte ablöst: Post und Website sahen aus wie zwei Marken.
// Die alte Karte trug Versalien mit Farbrändern, ein Röhrenbild und eine
// Handschrift - alles aus der Cyberpunk-Zeit. Die Website trägt seit dem
// 22.08. Navy, Glas, Inter und EINEN Verlauf. Diese Vorlage bringt beides
// zusammen.
//
// Der Aufbau, von oben nach unten:
//   - Motiv über die ganze Fläche, darüber ein ruhiger Verlauf in den
//     Seitengrund
//   - das Zeichen gross oben rechts (Tims Wahl "A", 104 px)
//   - ein GROSSWORT, das über die Oberkante der Glaskarte ins Bild ragt:
//     der Kern der Meldung in einem Wort, im Markenverlauf
//   - das Grosswort überlappt die Oberkante der Glaskarte. Kein
//     Pixelstaub, keine Auflösung (Tim, 24.08.2026).
//   - die Glaskarte mit Chip (Cyan-Punkt wie auf der Startseite) und der
//     Schlagzeile in Gross-/Kleinschreibung
//
// Die Bildquelle steht NICHT mehr im Bild, sondern in der Caption (Tim,
// 23.08.2026) - dadurch konnte die Karte tiefer rutschen und das Motiv
// gewinnt oben einen Streifen zurück.
//
// Das Wort wird nach dem Satz eingepasst: Ein langes Wort verkleinert die
// Schrift, und der Überhang über die Kartenkante wächst mit, damit alle
// Posts im Feed dieselbe Silhouette haben.

const HIER = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HIER, "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");

const BREITE = 1080;
const HOEHE = 1350;
const RAND = 56;

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (z) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z],
  );
}

/**
 * Leitet ein Grosswort aus der Schlagzeile ab, falls die Redaktion keines
 * geliefert hat. Bewusst schlicht: das längste Hauptwort der ersten Zeile.
 * Ein gutes Grosswort kommt von der Redaktion, das hier ist nur das Netz.
 */
export function grosswortAusZeilen(headlineLines, kicker) {
  const erste = (headlineLines?.[0] ?? [])
    .map((s) => (typeof s === "string" ? s : s.text))
    .join(" ");
  const woerter = erste
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((w) => w.length >= 4 && w.length <= 12);
  if (woerter.length === 0) return (kicker ?? "News").slice(0, 12);
  return woerter.sort((a, b) => b.length - a.length)[0];
}

/** Baut Wort und Schlagzeile - läuft IM Browser nach dem Laden. Wird
 * unverändert vom Reel-Renderer wiederverwendet, damit Bild und Reel nie
 * auseinanderlaufen können (Lehre aus dem alten Reel-Renderer, der ein
 * Duplikat der Karte war und deren Umbruch-Fehler erbte). */
export function einpassenQuelle() {
  return function einpassen() {
    const wort = document.getElementById("wort");
    const karte = document.querySelector(".karte");
    const titel = document.querySelector(".titel");
    const platz = karte.clientWidth - 100;

    const textbreite = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().width;
    };

    // 1) Grosswort einpassen. Ohne freien Staub braucht es rechts keinen
    // reservierten Streifen mehr - nur noch etwas Luft.
    let gr = 150;
    while (textbreite(wort) > platz * 0.92 && gr > 70) {
      gr -= 2;
      wort.style.fontSize = gr + "px";
    }
    // Der Ueberhang waechst mit der Schrift, damit alle Posts im Feed
    // dieselbe Silhouette haben.
    const ueberhang = Math.round(gr * 0.49);
    const feldEl = document.querySelector(".wortfeld");
    feldEl.style.top = `-${ueberhang}px`;
    feldEl.style.height = `${gr}px`;
    karte.style.paddingTop = `${ueberhang + 46}px`;

    // Kein Pixelstaub, keine Auflösung (Tim, 24.08.2026): Das Grosswort
    // steht sauber und überlappt die Oberkante der Glaskarte - das war der
    // Teil, der ihm gefallen hat.
    const weiteste = wort.getBoundingClientRect().right - feldEl.getBoundingClientRect().left;

    // 3) Schlagzeile einpassen
    let ts = 50;
    const laengste = () =>
      Math.max(
        ...[...titel.querySelectorAll(".z")].map((e) => textbreite(e)),
      );
    while (laengste() > titel.clientWidth && ts > 30) {
      ts -= 1;
      titel.style.fontSize = ts + "px";
    }

    return {
      wortgroesse: gr,
      wortBis: Math.round(weiteste),
      platz,
      titelgroesse: ts,
      titelBreite: Math.round(laengste()),
      passt: weiteste <= platz && laengste() <= titel.clientWidth + 1,
    };
  };
}

// GEMEINSAME VORLAGE FÜR STANDBILD UND REEL. Beide Renderer riefen früher
// zwei getrennte Kopien dieses CSS auf - genau daraus entstand beim alten
// Reel-Renderer ein eigener Umbruch-Fehler, den die Karte längst nicht mehr
// hatte (Fund 11.08.2026). Jetzt gibt es nur noch eine Quelle: kartenCss()
// liefert dieselbe Optik für beide, nur die Bildebene ist unterschiedlich -
// im Standbild ein <img>, im Reel durchsichtig, weil ffmpeg das bewegte
// Bild darunterlegt.
function kartenCss({ mitBildEbene, positionX, positionY }) {
  return `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${BREITE}px; height:${HOEHE}px;
    background:${mitBildEbene ? "#0C0B1A" : "transparent"}; overflow:hidden;
    position:relative; font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; }
  .bild { position:absolute; inset:0; overflow:hidden; }
  .bild img { width:100%; height:100%; object-fit:cover;
    object-position:${positionX}% ${positionY}%; display:block; }
  .bild::after { content:""; position:absolute; inset:0;
    background:linear-gradient(180deg, rgba(12,11,26,0.46) 0%, rgba(12,11,26,0) 26%,
      rgba(12,11,26,0.42) 62%, rgba(12,11,26,0.92) 100%); }
  .logo { position:absolute; right:${RAND}px; top:48px; height:104px; z-index:4;
    filter:drop-shadow(0 12px 32px rgba(0,0,0,0.62)); }
  .karte { position:absolute; left:${RAND}px; right:${RAND}px; bottom:${RAND}px;
    padding:118px 54px 46px; border-radius:44px;
    border:1px solid rgba(255,255,255,0.16); background:rgba(255,255,255,0.09);
    backdrop-filter:blur(30px) saturate(150%); }
  .wortfeld { position:absolute; left:50px; top:-74px; height:150px; }
  .wort { position:relative; display:inline-block; padding-right:0.12em;
    font-size:150px; font-weight:900; line-height:0.86; letter-spacing:-0.055em;
    text-transform:uppercase; white-space:nowrap;
    background:linear-gradient(120deg,#02F0D1,#FF2E97);
    -webkit-background-clip:text; background-clip:text; color:transparent;
    filter:drop-shadow(0 16px 42px rgba(0,0,0,0.62)); }
  /* Chip exakt wie auf der Startseite: Cyan-Punkt, und der rechte
     Innenabstand um die Laufweite gekuerzt, damit die Schrift mittig
     sitzt - sonst steht sie 0.4px zu weit links. */
  .chip { display:inline-flex; align-items:center; gap:11px;
    padding:11px calc(24px - 0.1em) 11px 24px; border-radius:999px;
    border:1px solid rgba(255,255,255,0.24); background:rgba(255,255,255,0.14);
    font-size:20px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase;
    color:#fff; }
  .chip i { display:block; width:11px; height:11px; border-radius:999px; background:#02F0D1; }
  .titel { margin-top:22px; font-size:50px; font-weight:700; line-height:1.2;
    letter-spacing:-0.025em; color:#fff; }
  .titel .z { display:block; white-space:nowrap; }`;
}

function kartenBody({ mitBildEbene, bild, wort, kicker, zeilen }) {
  return `
  <div class="bild">${mitBildEbene ? `<img src="file://${bild}">` : ""}</div>
  <img class="logo" src="file://${LOGO}">
  <div class="karte">
    <div class="wortfeld"><span class="wort" id="wort">${escapeHtml(wort)}</span></div>
    <span class="chip"><i></i>${escapeHtml(kicker ?? "")}</span>
    <div class="titel">${zeilen.map((z) => `<span class="z">${escapeHtml(z)}</span>`).join("")}</div>
  </div>`;
}

function zeilenAusHeadline(headlineLines) {
  return (headlineLines ?? []).map((z) =>
    Array.isArray(z)
      ? z.map((seg) => (typeof seg === "string" ? seg : seg.text)).join("")
      : String(z),
  );
}

/**
 * Rendert die neue Post-Grafik.
 *
 * @param {object}   o
 * @param {string[][]|string[]} o.headlineLines  Schlagzeile, eine Zeile je Eintrag
 * @param {string}   o.kicker      Spiel, Studio oder Hardware (Chip)
 * @param {string}  [o.grosswort]  Der Kern der Meldung in EINEM Wort
 * @param {string}   o.imagePath   Absoluter Pfad zum Motiv
 * @param {string}   o.outPath     Absoluter Zielpfad (.jpg)
 * @param {object}   o.chromium    playwright.chromium
 */
export async function renderKarte({
  headlineLines,
  kicker,
  grosswort,
  imagePath,
  outPath,
  chromium,
}) {
  // Schwarze Balken zuerst entfernen - sonst rechnet der Ausschnittsucher
  // sie als Bildinhalt mit (Tim, 13.08.2026, Halo-Post).
  const balkenfrei = await entferneBalken(imagePath);
  if (balkenfrei.beschnitten) {
    console.log(`  Schwarze Balken entfernt (${JSON.stringify(balkenfrei.balken)})`);
  }
  const bild = balkenfrei.pfad;
  const { positionX, positionY } = await besterAusschnitt(bild);

  const zeilen = zeilenAusHeadline(headlineLines);
  const wort = grosswort || grosswortAusZeilen(headlineLines, kicker);

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>${kartenCss({ mitBildEbene: true, positionX, positionY })}</style></head><body>${kartenBody({ mitBildEbene: true, bild, wort, kicker, zeilen })}
</body></html>`;

  const htmlDatei = join(tmpdir(), `rop-karte-${Date.now()}.html`);
  await writeFile(htmlDatei, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: BREITE, height: HOEHE },
      deviceScaleFactor: 2,
    });
    // Als Datei laden statt setContent: nur mit file://-Seitenkontext darf
    // Chromium die file://-Bilder mitladen - UND nur dort laedt die
    // Schrift. Ohne das faellt alles still auf eine Ersatzschrift zurueck
    // (nachgemessen 23.08.2026: Inter 488.1px, Ersatz 501.6px Textbreite).
    await page.goto(`file://${htmlDatei}`, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    if (!(await page.evaluate(() => document.fonts.check("900 40px Inter")))) {
      console.log("::warning::Post-Grafik: Inter nicht geladen - Grafik laeuft in Ersatzschrift");
    }

    const mass = await page.evaluate(
      `(${einpassenQuelle().toString()})()`,
    );
    if (!mass.passt) {
      console.log(
        `  Hinweis: Vorlage eng - Wort ${mass.wortgroesse}px bis ${mass.wortBis} von ${mass.platz}px, Schlagzeile ${mass.titelgroesse}px`,
      );
    }
    await page.waitForTimeout(120);
    const png = await page.screenshot();
    await mkdir(dirname(outPath), { recursive: true });
    // 2160x2700 rendern und auf 1080x1350 herunterrechnen: Lanczos glaettet
    // die Schriftkanten, und die Abnahme erwartet genau diese Groesse.
    await sharp(png).resize(BREITE, HOEHE).jpeg({ quality: 90 }).toFile(outPath);
    return { grosswort: wort, ...mass };
  } finally {
    await browser.close();
    await rm(htmlDatei, { force: true });
  }
}

export { kartenCss, kartenBody, zeilenAusHeadline, BREITE, HOEHE, RAND, LOGO, escapeHtml };
