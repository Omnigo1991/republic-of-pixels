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
//   - Pixelstaub, der das Grosswort nach rechts auflöst - abgeleitet aus
//     dem Schweif unseres R (gemessen: quadratische Module, Richtung
//     rechts unten, Ausdünnung nach aussen). Dosierung "fein" (Tim).
//   - die Glaskarte mit Chip (Cyan-Punkt wie auf der Startseite) und der
//     Schlagzeile in Gross-/Kleinschreibung
//
// Die Bildquelle steht NICHT mehr im Bild, sondern in der Caption (Tim,
// 23.08.2026) - dadurch konnte die Karte tiefer rutschen und das Motiv
// gewinnt oben einen Streifen zurück.
//
// REIHENFOLGE IST PFLICHT: Erst das Wort einpassen, dann den Staub
// rechnen. Andersherum wächst der Staub nicht mit, wenn ein langes Wort
// die Schrift verkleinert - bei "Eingestellt" lief er 258 px aus der
// Karte (gefunden am 23.08.2026 im Muster, nicht im Betrieb).

const HIER = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HIER, "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");

const BREITE = 1080;
const HOEHE = 1350;
const RAND = 56;
const STAUB_STAERKE = 0.55; // Tims Wahl: fein

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

/** Baut Wort, Staub und Schlagzeile - läuft IM Browser, nach dem Laden. */
function einpassenQuelle() {
  return function einpassen(staerke) {
    const wort = document.getElementById("wort");
    const feld = document.getElementById("staub");
    const karte = document.querySelector(".karte");
    const titel = document.querySelector(".titel");
    feld.innerHTML = "";
    const platz = karte.clientWidth - 100;

    const textbreite = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().width;
    };

    // 1) Grosswort einpassen - ein Viertel der Breite bleibt fuer den Staub
    let gr = 150;
    while (textbreite(wort) > platz * 0.76 && gr > 70) {
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

    // 2) Pixelstaub - Raster, Richtung und Ausduennung wie im Zeichen
    const r = wort.getBoundingClientRect();
    const eltern = wort.parentElement.getBoundingClientRect();
    // ABSTAND ZUM WORT (Tim, 23.08.2026): Der Kasten des Wortes traegt
    // rechts 0.12em Polster, damit der letzte Buchstabe nicht angeschnitten
    // wird - dort endet also die Schrift, nicht der Kasten. Von dieser
    // Tintenkante aus bleibt eine Modulbreite Luft, bevor der erste Kruemel
    // kommt. Vorher begann er direkt am Buchstaben und klebte daran.
    const tinteRechts = r.right - eltern.left - Math.round(gr * 0.12);
    const links = tinteRechts + Math.round(gr * 0.11);
    const M = Math.max(6, Math.round(gr * 0.078));
    const bandOben = r.height * 0.16;
    const bandHoehe = r.height * 0.62;
    const spalten = Math.round(13 * staerke) + 4;
    // Feste Zahlenfolge aus dem Wort: derselbe Post sieht immer gleich aus,
    // verschiedene Posts unterscheiden sich - aber keiner erwischt eine
    // ungluecklich zerstreute Fassung.
    let s = 0;
    for (const z of wort.textContent) s = (s * 31 + z.charCodeAt(0)) % 100000;
    const zufall = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    let weiteste = links;
    for (let sp = 0; sp < spalten; sp++) {
      const x = links + sp * M * 1.5;
      if (x + M > platz) break;
      const dichte = Math.pow(1 - sp / spalten, 1.7) * staerke;
      const zeilen = Math.max(1, Math.round(bandHoehe / (M * 1.5)));
      for (let z = 0; z < zeilen; z++) {
        if (zufall() > dichte) continue;
        const y = bandOben + z * M * 1.5 + sp * M * 0.34;
        const b = document.createElement("b");
        b.style.width = M + "px";
        b.style.height = M + "px";
        b.style.left = Math.round(x) + "px";
        b.style.top = Math.round(y) + "px";
        const t = Math.min(1, 0.55 + (sp / spalten) * 0.45);
        b.style.background =
          "rgb(" + Math.round(2 + 253 * t) + "," + Math.round(240 - 194 * t) +
          "," + Math.round(209 - 58 * t) + ")";
        b.style.opacity = (0.95 - (sp / spalten) * 0.55).toFixed(2);
        feld.appendChild(b);
        weiteste = Math.max(weiteste, x + M);
      }
    }

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
      modul: M,
      kruemel: feld.querySelectorAll("b").length,
      staubBis: Math.round(weiteste),
      platz,
      titelgroesse: ts,
      titelBreite: Math.round(laengste()),
      passt: weiteste <= platz && laengste() <= titel.clientWidth + 1,
    };
  };
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

  const zeilen = (headlineLines ?? []).map((z) =>
    Array.isArray(z)
      ? z.map((seg) => (typeof seg === "string" ? seg : seg.text)).join("")
      : String(z),
  );
  const wort = grosswort || grosswortAusZeilen(headlineLines, kicker);

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${BREITE}px; height:${HOEHE}px; background:#0C0B1A; overflow:hidden;
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
  .staub { position:absolute; left:0; top:0; pointer-events:none;
    filter:drop-shadow(0 10px 26px rgba(0,0,0,0.45)); }
  .staub b { position:absolute; display:block; }
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
  .titel .z { display:block; white-space:nowrap; }
</style></head><body>
  <div class="bild"><img src="file://${bild}"></div>
  <img class="logo" src="file://${LOGO}">
  <div class="karte">
    <div class="wortfeld"><span class="wort" id="wort">${escapeHtml(wort)}</span><div class="staub" id="staub"></div></div>
    <span class="chip"><i></i>${escapeHtml(kicker ?? "")}</span>
    <div class="titel">${zeilen.map((z) => `<span class="z">${escapeHtml(z)}</span>`).join("")}</div>
  </div>
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
      `(${einpassenQuelle().toString()})(${STAUB_STAERKE})`,
    );
    if (!mass.passt) {
      console.log(
        `  Hinweis: Vorlage eng - Wort ${mass.wortgroesse}px, Staub bis ${mass.staubBis} von ${mass.platz}px, Schlagzeile ${mass.titelgroesse}px`,
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
