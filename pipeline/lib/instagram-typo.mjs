import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// TYPO-KARTE, Neufassung nach Tims Entscheid vom 14.08.2026.
//
// WAS VORHER WAR: Zentrierte Schlagzeile mit Cyan-Klammern, Pixel-Quadraten,
// Glow und Wasserzeichen-R. Tims Urteil: "Die Typo-Karte überzeugt mich
// überhaupt nicht. Sie wirkt leer."
//
// WARUM SIE LEER WIRKTE: Nicht wegen zu wenig Schmuck, sondern wegen zu
// viel am falschen Ort. Klammern und Pixel sassen weit aussen und haben die
// leere Fläche EINGERAHMT statt sie zu füllen. Die Schlagzeile stand in der
// Größe der Bild-Karte mittig — dort trägt aber ein Foto die restliche
// Fläche.
//
// TIMS VORGABE (wörtlich): "Layout genau gleich wie Postvorlage (R unten,
// Quelle unten links) / Hintergrund in Navy, voll ausgefüllt / Schrift genau
// wie bei unserer Postvorlage, nur nicht links, sondern mittig / Keine
// weiteren Linien etc." — dazu Variante D2: Cyan-Icons je Kategorie,
// gestreut in der Navy-Fläche.
//
// Abweichungen von der Bild-Karte, alle von Tim abgenommen:
//   1. Der Block steht MITTIG statt unten. Auf der Bild-Karte klebt er
//      unten, WEIL darüber das Foto sitzt; ohne Foto liest das leere obere
//      Drittel wie ein vergessenes Bild.
//   2. Die Schlagzeile ist GRÖSSER: 104 px statt 75 px. Bei gleicher Größe
//      wirkt sie verloren, weil kein Bild die Fläche mitträgt.
//   3. Unten links bleibt LEER. Dort steht auf der Bild-Karte der
//      Bildnachweis; hier gibt es kein Bild und nichts nachzuweisen. Ein
//      Datum als Platzfüller hat Tim ausdrücklich abgelehnt.
//
// Alle übrigen Werte sind unverändert aus instagram-card.mjs übernommen —
// Kopfzeile 26 px, Notiz 47 px, Ränder 60 px, Logohöhe 44 px, gerendert in
// 1080×1350 mit doppelter Pixeldichte. Damit sind die Zahlen hier direkt mit
// der Bild-Karte vergleichbar.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");

// Aus instagram-card.mjs — bei Änderungen dort mitziehen.
const G = 60;
const LOGO_H = 44;

const TITEL_GROESSE = 104;
const TITEL_MIN = 72;

// ---------- Icons ----------
//
// Flächige Formen auf einem 24×24-Raster, ausschliesslich gefüllt. Ein
// früher Entwurf mischte Füllung und Kontur — der Controller wurde dadurch
// zum Klumpen. Aussparungen sind in Navy übergemalt, nicht ausgestanzt; das
// funktioniert, weil die Icons frei auf der Navy-Fläche liegen.
const NAVY = "#0C0B1A";
const FORMEN = {
  controller: `<path d="M7 8h10a5 5 0 0 1 4.9 4l.8 4.3A2.9 2.9 0 0 1 20 20c-1 0-1.9-.5-2.4-1.4L16.2 16H7.8l-1.4 2.6C5.9 19.5 5 20 4 20a2.9 2.9 0 0 1-2.7-3.7L2.1 12A5 5 0 0 1 7 8z"/><rect x="5.2" y="11.6" width="4.4" height="1.4" fill="${NAVY}"/><rect x="6.7" y="10.1" width="1.4" height="4.4" fill="${NAVY}"/><circle cx="16" cy="11.6" r="1.15" fill="${NAVY}"/><circle cx="18.3" cy="13.7" r="1.15" fill="${NAVY}"/>`,
  blitz: `<path d="M14 2L4.5 13.8h5.6L9 22l9.6-12.2h-5.7z"/>`,
  tropfen: `<path d="M12 2.6s6.4 7.3 6.4 11.4a6.4 6.4 0 0 1-12.8 0C5.6 9.9 12 2.6 12 2.6z"/>`,
  schloss: `<rect x="4.5" y="10.5" width="15" height="10.5" rx="1.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5h-2.4V8a1.6 1.6 0 0 0-3.2 0v2.5z"/><circle cx="12" cy="15.2" r="1.7" fill="${NAVY}"/>`,
  auge: `<path d="M12 5c5 0 9 4.4 9 7s-4 7-9 7-9-4.4-9-7 4-7 9-7z"/><circle cx="12" cy="12" r="3.1" fill="${NAVY}"/>`,
  ausrufe: `<rect x="10.2" y="3" width="3.6" height="12" rx="1.5"/><circle cx="12" cy="19.4" r="2.2"/>`,
  stern: `<path d="M12 1.8l2.2 7.9 7.9 2.2-7.9 2.2-2.2 7.9-2.2-7.9L1.8 12l7.9-2.2z"/>`,
  herz: `<path d="M12 21.2S3.6 15.6 3.6 10.2A4.7 4.7 0 0 1 12 7.1a4.7 4.7 0 0 1 8.4 3.1c0 5.4-8.4 11-8.4 11z"/>`,
  trophaee: `<path d="M7 3h10v5.4a5 5 0 0 1-10 0z"/><path d="M7 4.4H4.2v2A3.6 3.6 0 0 0 7.6 10M17 4.4h2.8v2A3.6 3.6 0 0 1 16.4 10" stroke="#02F0D1" stroke-width="1.5" fill="none"/><rect x="10.6" y="13" width="2.8" height="4"/><rect x="7.4" y="17" width="9.2" height="2.6" rx="1"/>`,
  pixel: `<rect x="3.5" y="3.5" width="6.5" height="6.5"/><rect x="12.5" y="9" width="4.2" height="4.2"/><rect x="8" y="15.5" width="5.4" height="5.4"/>`,
};

// ICONS JE KATEGORIE (Tim, 14.08.2026: "Icons pro Kategorie").
//
// Bewusst eine feste Zuordnung im Code statt einer Wahl durch Claude: Das
// ist eine Entscheidung weniger pro Post, die danebengreifen kann, und sie
// braucht keinen eigenen Wächter. "pixel" steht in jedem Satz — es zitiert
// die Pixel-Spur unseres R und hält die Kategorien optisch zusammen.
const KATEGORIE_ICONS = {
  breaking: ["blitz", "ausrufe", "stern", "pixel"],
  leaks: ["tropfen", "auge", "schloss", "pixel"],
  reviews: ["stern", "trophaee", "herz", "pixel"],
  news: ["controller", "stern", "herz", "pixel"],
};
const STANDARD_ICONS = KATEGORIE_ICONS.news;

// Streumuster aus Variante D2. Feste Plätze.
//
// TEXTBAND FREIHALTEN: Der Textblock belegt gemessen y 485 bis 864. Kein
// Platz darf dort hineinragen — auch nicht knapp. Ein Icon bei y 520 sass im
// ersten Entwurf direkt am "N" von NETFLIX und las sich als Schmutz. Alle
// Plätze enden deshalb spätestens bei y 470 oder beginnen frühestens bei
// y 880 (Platz + eigene Größe gerechnet).
const PLAETZE = [
  { x: 90, y: 120, size: 66, op: 0.5, rot: 0 },
  { x: 300, y: 210, size: 44, op: 0.3, rot: 12 },
  { x: 620, y: 130, size: 92, op: 0.55, rot: -8 },
  { x: 880, y: 250, size: 52, op: 0.32, rot: 0 },
  { x: 130, y: 330, size: 56, op: 0.28, rot: -6 },
  { x: 900, y: 395, size: 70, op: 0.4, rot: 0 },
  { x: 55, y: 415, size: 38, op: 0.24, rot: 0 },
  { x: 940, y: 900, size: 58, op: 0.45, rot: 0 },
  { x: 120, y: 980, size: 84, op: 0.5, rot: 10 },
  { x: 420, y: 1130, size: 46, op: 0.3, rot: -8 },
  { x: 700, y: 1050, size: 40, op: 0.26, rot: 14 },
  { x: 830, y: 1160, size: 62, op: 0.35, rot: 8 },
];

// Aus dem Text abgeleitete Streuung: Dieselbe Meldung ergibt immer dasselbe
// Bild (nachvollziehbar, kein Zufall im Rendering), verschiedene Meldungen
// derselben Kategorie sehen aber unterschiedlich aus.
// REIHUM STATT GEWÜRFELT (Korrektur 14.08.2026): Der erste Entwurf zog für
// jeden Platz ein zufälliges Icon. Beim ersten Testbild ergab das sieben
// Sterne, drei Herzen und keinen einzigen Controller — die Kategorie war
// nicht mehr erkennbar. Jetzt werden die Icons reihum vergeben, sodass jedes
// gleich oft vorkommt; aus dem Text abgeleitet wird nur noch, bei welchem
// Icon die Reihe beginnt.
function streusel(text, icons) {
  let h = 2166136261;
  for (const z of String(text)) {
    h ^= z.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const start = h % icons.length;
  return PLAETZE.map((p, i) => ({ ...p, name: icons[(start + i) % icons.length] }));
}

function iconHtml(text, kategorie) {
  const icons = KATEGORIE_ICONS[kategorie] ?? STANDARD_ICONS;
  return streusel(text, icons)
    .map(
      (p) =>
        `<svg class="ico" viewBox="0 0 24 24" style="left:${p.x}px;top:${p.y}px;width:${p.size}px;height:${p.size}px;opacity:${p.op};transform:rotate(${p.rot}deg)"><g fill="#02F0D1">${FORMEN[p.name]}</g></svg>`,
    )
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function headlineHtml(headlineLines) {
  // Jede Zeile ein eigener Block mit nowrap — nie heimlich umbrechen, sondern
  // die Schrift verkleinern. Gleiche Regel wie bei der Bild-Karte.
  return headlineLines
    .map(
      (line) =>
        `<span class="zeile">${line
          .map((seg) =>
            seg.cyan
              ? `<span class="cy">${escapeHtml(seg.text)}</span>`
              : escapeHtml(seg.text)
          )
          .join(" ")}</span>`
    )
    .join("");
}

/**
 * @param {boolean} [o.icons=true] Icon-Streuung zeichnen. Abschaltbar, damit
 *   die Mittigkeit des Textblocks am fertigen Bild NACHGEMESSEN werden kann —
 *   mit Icons misst jede Tinte-Prüfung die Icons mit und ist wertlos. Das ist
 *   keine Test-Hintertür, sondern die Voraussetzung dafür, dass wir die
 *   Ausrichtung überhaupt prüfen können statt sie zu behaupten.
 */
export async function renderTypoCard({
  headlineLines,
  kicker,
  notiz,
  kategorie = "news",
  icons = true,
  outPath,
  chromium,
}) {
  await mkdir(dirname(outPath), { recursive: true });

  const kickerHtml = kicker ? `<div class="kicker">${escapeHtml(kicker)}</div>` : "";
  const notizHtml = notiz ? `<div class="notiz">${escapeHtml(notiz)}</div>` : "";
  const streuText = headlineLines
    .map((l) => l.map((s) => s.text).join(" "))
    .join(" ");

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&family=Caveat:wght@700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1350px; background:#0C0B1A; overflow:hidden; position:relative; }
  .ico { position:absolute; }
  .stapel { position:absolute; left:${G}px; right:${G}px; top:50%;
    transform:translateY(-50%);
    display:flex; flex-direction:column; align-items:center; text-align:center; }
  .kicker { font-family:'Inter',sans-serif; font-weight:900; font-size:26px;
    letter-spacing:0.20em; text-transform:uppercase; color:#02F0D1; margin-bottom:17px; }
  /* ZEILENABSTAND 1.34 wie bei der Bild-Karte: Der Marker-Kasten hängt an
     einem Wort INNERHALB der Zeile und beansprucht keine eigene Höhe —
     padding vergrössert die Zeilenbox nicht. Ohne diese Luft läuft der
     Kasten in die Zeile darunter. */
  /* width:100% ist PFLICHT: In einem Flex-Stapel schrumpft ein Block-Kind
     sonst auf seine Inhaltsbreite, und die Einpassung misst die Zeile gegen
     sich selbst — sie wäre immer zufrieden. */
  .titel { font-family:'Inter',sans-serif; font-weight:900; text-transform:uppercase;
    width:100%; text-align:center; font-size:${TITEL_GROESSE}px; line-height:1.34;
    letter-spacing:-0.02em; color:#FFFFFF; }
  .titel .zeile { display:block; white-space:nowrap; }
  .titel .cy { background:#02F0D1; color:#0C0B1A; padding:1px 9px 5px 9px; }
  /* transform-origin mittig statt links — sonst kippt die Notiz aus der
     Mittelachse. */
  .notiz { font-family:'Caveat',cursive; font-weight:700; font-size:47px; line-height:1.0;
    color:#02F0D1; margin-top:24px; transform:rotate(-2deg); transform-origin:center center; }
  .logo { position:absolute; left:50%; transform:translateX(-50%); bottom:${G}px; height:${LOGO_H}px; }
</style></head><body>
  ${icons ? iconHtml(streuText, kategorie) : ""}
  <div class="stapel">${kickerHtml}<div class="titel">${headlineHtml(headlineLines)}</div>${notizHtml}</div>
  <img class="logo" src="file://${LOGO}">
</body></html>`;

  const htmlPath = join(tmpdir(), `rop-typo-${Date.now()}.html`);
  await writeFile(htmlPath, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 2,
    });
    // NICHT AUF "networkidle" WARTEN (Fund 13.08.2026): Der Abruf der
    // Google-Schriften laeuft gelegentlich in die 30-Sekunden-Grenze, und
    // Playwright wirft dann einen Fehler — in GitHub Actions kostet das den
    // ganzen Lauf. Zuverlaessiger: auf "load" warten und dann gezielt
    // darauf, dass die Schriften wirklich da sind. Das ist sogar strenger,
    // denn mit Ersatzschrift gemessene Breiten waeren falsch.
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const einpassung = await page.evaluate(
      ({ min }) => {
        const titel = document.querySelector(".titel");
        const zeilen = [...titel.querySelectorAll(".zeile")];
        const maxBreite = titel.clientWidth;

        // BREITE ALS VEREINIGUNG VON RANGE UND KIND-ELEMENTEN (Fund
        // 13.08.2026, Bild-Karte): Eine Range misst nur den Text, nicht den
        // Innenabstand des Marker-Kastens. Gemessen wurde deshalb zu wenig,
        // und der Kasten lief rechts aus dem Bild.
        const breiteVon = (el) => {
          const r = document.createRange();
          r.selectNodeContents(el);
          let { left, right } = r.getBoundingClientRect();
          for (const kind of el.querySelectorAll("*")) {
            const k = kind.getBoundingClientRect();
            left = Math.min(left, k.left);
            right = Math.max(right, k.right);
          }
          return right - left;
        };

        let groesse = parseFloat(getComputedStyle(titel).fontSize);
        const passt = () => zeilen.every((z) => breiteVon(z) <= maxBreite + 0.5);
        while (!passt() && groesse > min) {
          groesse -= 2;
          titel.style.fontSize = `${groesse}px`;
        }
        return { groesse, passt: passt() };
      },
      { min: TITEL_MIN },
    );

    // WAAGRECHTE MITTE — die nachgestellte Buchstabenlücke ausgleichen
    // (Tim, 14.08.2026: "bitte sicherstellen, dass es absolut mittig ist").
    //
    // Bei letter-spacing bekommt AUCH DER LETZTE Buchstabe seinen Abstand
    // nachgestellt. Zentriert wird die Zeile inklusive dieser unsichtbaren
    // Lücke, die sichtbare Schrift sitzt dadurch um die halbe Lücke daneben.
    // Gemessen am fertigen Bild: Kopfzeile 3.0 px zu weit links (Abstand
    // +0.20em), Schlagzeile 1.5 px zu weit rechts (Abstand -0.02em).
    //
    // text-indent in Höhe des Abstands hebt das rechnerisch exakt auf: Die
    // Einrückung schiebt den Zeilenanfang um genau so viel, wie die Lücke am
    // Ende zu viel zählt.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll(".kicker, .titel")) {
        const abstand = parseFloat(getComputedStyle(el).letterSpacing);
        if (Number.isFinite(abstand) && abstand !== 0) {
          el.style.textIndent = `${abstand}px`;
        }
      }
    });

    // SENKRECHTE MITTE — an den gemalten Pixeln ausgerichtet, nicht an der
    // Elementbox. Elementboxen tragen oben und unten unterschiedlich viel
    // Zeilenluft, und die gedrehte Notiz vergrössert ihre Box zusätzlich.
    // Gemessen am fertigen Bild sass der Block 3.5 px zu tief.
    //
    // Darum ein Messdurchgang: Icons kurz ausblenden (sie würden die
    // Tinte-Messung verfälschen), Bild aufnehmen, Mitte bestimmen,
    // korrigieren, Icons zurück.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll(".ico")) el.style.visibility = "hidden";
    });
    await page.waitForTimeout(80);
    const probe = await page.screenshot({ type: "png" });
    await page.evaluate(() => {
      for (const el of document.querySelectorAll(".ico")) el.style.visibility = "";
    });

    const versatz = await senkrechterVersatz(probe);
    if (versatz !== null) {
      await page.evaluate((dy) => {
        document.querySelector(".stapel").style.transform =
          `translateY(calc(-50% + ${dy}px))`;
      }, versatz);
      console.log(`  Typo-Karte: Textblock um ${versatz} px senkrecht ausgerichtet`);
    }

    if (!einpassung.passt) {
      console.log(
        `  Hinweis: Typo-Schlagzeile passt auch bei ${einpassung.groesse}px nicht — Zeile zu lang`,
      );
    } else if (einpassung.groesse < TITEL_GROESSE * 0.9) {
      console.log(
        `  Hinweis: Typo-Schlagzeile auf ${einpassung.groesse}px verkleinert (Grundgröße ${TITEL_GROESSE})`,
      );
    }

    await page.waitForTimeout(150);
    const shot = await page.screenshot({ type: "png" });
    await sharp(shot).resize(1080, 1350).jpeg({ quality: 90 }).toFile(outPath);
  } finally {
    await browser.close();
    await rm(htmlPath, { force: true });
  }
  return outPath;
}

/**
 * Bestimmt, um wieviele CSS-Pixel der Textblock verschoben werden muss,
 * damit seine gemalte Tinte senkrecht mittig sitzt.
 * Das Logo unten wird ausgeklammert — es steht fest und gehört nicht zum Block.
 */
async function senkrechterVersatz(png) {
  const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  const B = info.width;
  const H = info.height;
  const skala = H / 1350; // doppelte Pixeldichte
  const SCHWELLE = 40; // Navy liegt bei rund 12
  const logoAb = Math.round(1200 * skala);

  let oben = -1;
  let unten = -1;
  for (let y = 0; y < logoAb; y++) {
    let tinte = false;
    for (let x = 0; x < B; x++) {
      if (data[y * B + x] > SCHWELLE) {
        tinte = true;
        break;
      }
    }
    if (tinte) {
      if (oben < 0) oben = y;
      unten = y;
    }
  }
  if (oben < 0) return null;

  const mitteIst = (oben + unten) / 2 / skala;
  const versatz = 1350 / 2 - mitteIst;
  // Nur eingreifen, wenn es sich lohnt — und nie wild verschieben, falls
  // die Messung durch etwas Unerwartetes danebengeht.
  if (Math.abs(versatz) < 0.5 || Math.abs(versatz) > 80) return null;
  return Math.round(versatz * 10) / 10;
}
