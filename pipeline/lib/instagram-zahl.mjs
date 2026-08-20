import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { headlineHtml, schriftEinpassenQuelle } from "./instagram-card.mjs";

// ┌──────────────────────────────────────────────────────────────────────┐
// │ STATUS: NICHT EINGEBUNDEN. Diese Datei wird von nichts importiert.    │
// │                                                                       │
// │ Sie ist ein Entwurf, kein toter Code - Tim hat sie am 13.08.2026      │
// │ ausdruecklich NICHT verworfen ("Die Zahlenkarten sehen eigentlich gut │
// │ aus"), aber auch nicht freigegeben. Offen war seine Frage, ob wir     │
// │ hier nicht doch Artwork verwenden sollten, und das "XT" der Radeon-   │
// │ Karte, das allein auf der zweiten Zeile stand.                        │
// │                                                                       │
// │ WARUM DIESER KASTEN HIER STEHT: Der Umlaut-Waechter lag zwei Tage     │
// │ fertig herum, ohne eingebunden zu sein - in dieser Zeit passierte der │
// │ Fehler dreimal. Unfertige Bausteine sind nicht das Problem, still     │
// │ vergessene sind es. Wer diese Datei oeffnet, weiss jetzt sofort,      │
// │ woran sie haengt.                                                     │
// │                                                                       │
// │ ZUM EINBINDEN FEHLT: Tims Entscheid zur Artwork-Frage, die Behebung   │
// │ der Waisen-Zeile, und dieselbe Abstimmung mit der Abnahme, die die    │
// │ Typo-Karte am 14.08. einen ganzen Lauf gekostet hat (Zeilenzahl und   │
// │ Randabstand - siehe pipeline/lib/abnahme.mjs).                        │
// └──────────────────────────────────────────────────────────────────────┘
//
// ZAHLEN-KARTE (13.08.2026) - eigene Bildsprache für Meldungen ohne Motiv.
//
// WARUM: Unsere Artikelbilder stammen aus dem Feed der Quelle. Bei
// Spiel-Meldungen ist das brauchbar, bei Firmen- und Branchennachrichten
// nicht: Da illustrierte eine Entlassungsmeldung bei CD Projekt ein
// Geralt-Render, eine Twitch-Richtlinie ein unscharfes Logo-Foto und eine
// Meldung über Super Mario Sunshine ein GameCube-Controller. Tim beim
// Durchsehen: "Wenn das echte Posts wären, wäre ich enttäuscht."
//
// Das Problem ist nicht, dass uns Bilder FEHLEN - es ist, dass wir fremde
// Bilder benutzen, die mit der Story nichts zu tun haben. Ein perfekt
// gesetzter Marker über einem falschen Bild ist ein perfekt gesetzter Fehler.
//
// Diese Karte leiht sich gar kein Bild. Sie macht die ZAHL zum Motiv - und
// das Material dafür liegt schon vor: Alle 25 zuletzt geprüften Artikel
// tragen einen stats-Block mit ein bis drei starken Zahlen ("20 %",
// "14'000", "150 → 300"). Bei einer Preiserhöhung IST die Zahl die Nachricht.
//
// Aufbau: oben die Zahl gross, darunter ihre Erklärung; unten derselbe
// Textblock wie auf der Marker-Karte (Kopfzeile, Schlagzeile, Notiz), damit
// beide Kartenarten im Raster als eine Familie erkennbar bleiben.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOGO = join(ROOT, "public", "brand", "r-mark.png");
const G = 60;
const LOGO_H = 60;

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function renderZahlCard({
  zahl, // z. B. "20 %", "14'000", "150 → 300"
  zahlLabel, // Erklärung, z. B. "Preisanstieg bei der RX 9070 XT"
  headlineLines,
  kicker,
  notiz,
  outPath,
  chromium,
}) {
  const logoUrl = pathToFileURL(LOGO).href;
  const notizHtml = notiz ? `<div class="notiz">${escapeHtml(notiz)}</div>` : "";

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&family=Caveat:wght@700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1350px; background:#0C0B1A; overflow:hidden; position:relative;
    font-family:'Inter',sans-serif; }
  .glow { position:absolute; left:-10%; top:-12%; width:900px; height:900px;
    background:radial-gradient(circle, rgba(2,240,209,0.13) 0%, rgba(2,240,209,0) 65%); }
  /* Die Zahl sitzt dort, wo sonst das Motiv ist. Sie ist das Motiv. */
  .zahlblock { position:absolute; left:${G}px; right:${G}px; top:150px; }
  .zahl { font-weight:900; font-size:300px; line-height:0.92; letter-spacing:-0.045em;
    color:#FFFFFF; white-space:nowrap; }
  .zahl-label { font-weight:900; font-size:30px; letter-spacing:0.16em; text-transform:uppercase;
    color:#02F0D1; margin-top:28px; max-width:820px; line-height:1.35; }
  .trennlinie { position:absolute; left:${G}px; width:120px; height:8px; background:#02F0D1;
    top:118px; }
  .stapel { position:absolute; left:${G}px; right:${G}px; bottom:${G + LOGO_H + G}px;
    display:flex; flex-direction:column; align-items:flex-start; text-align:left; }
  .kicker { font-weight:900; font-size:26px; letter-spacing:0.20em; text-transform:uppercase;
    color:#02F0D1; margin-bottom:17px; }
  .titel { font-weight:900; text-transform:uppercase; width:100%; text-align:left;
    font-size:66px; line-height:1.34; letter-spacing:-0.02em; color:#FFFFFF; }
  .titel .zeile { display:block; white-space:nowrap; }
  .titel .cy { background:#02F0D1; color:#0C0B1A; padding:1px 9px 5px 9px; }
  .notiz { font-family:'Caveat',cursive; font-weight:700; font-size:47px; line-height:1.0;
    color:#02F0D1; margin-top:24px; transform:rotate(-2deg); transform-origin:left center; }
  .logo { position:absolute; left:50%; transform:translateX(-50%); bottom:${G}px; height:${LOGO_H}px; }
  .label { position:absolute; left:40px; bottom:30px; font-weight:900; font-size:14px;
    letter-spacing:0.14em; text-transform:uppercase; color:rgba(255,255,255,0.32); }
</style></head><body>
  <div class="glow"></div>
  <div class="trennlinie"></div>
  <div class="zahlblock">
    <div class="zahl">${escapeHtml(zahl)}</div>
    <div class="zahl-label">${escapeHtml(zahlLabel)}</div>
  </div>
  <div class="stapel">
    <div class="kicker">${escapeHtml(kicker)}</div>
    <div class="titel">${headlineHtml(headlineLines)}</div>
    ${notizHtml}
  </div>
  <img class="logo" src="${logoUrl}">
  <div class="label">Republic of Pixels</div>
</body></html>`;

  const htmlFile = join(tmpdir(), `rop-zahl-${Date.now()}.html`);
  await writeFile(htmlFile, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 2,
    });
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    // Schlagzeile einpassen wie überall: nie umbrechen, sondern verkleinern.
    await page.evaluate(`(${schriftEinpassenQuelle().toString()})(300, 1.0)`);

    // DIE ZAHL FÜLLT DIE BREITE - in beide Richtungen. Ein reines
    // Verkleinern (wie bei der Schlagzeile) reicht hier nicht: "150 → 300"
    // ist viel breiter als "18", und eine kleine "18" auf leerer Fläche
    // wirkt verloren statt wuchtig. Die Zahl IST das Motiv dieser Karte,
    // also skaliert sie auf den Satzspiegel - nach unten wie nach oben.
    await page.evaluate(() => {
      const el = document.querySelector(".zahl");
      const rahmen = el.parentElement.clientWidth * 0.98;
      const breite = () => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().width;
      };
      let groesse = parseFloat(getComputedStyle(el).fontSize);
      // Erst wachsen lassen (Deckel 430 px, sonst überragt eine kurze Zahl
      // den halben Satzspiegel in der Höhe), dann bei Bedarf verkleinern.
      while (breite() < rahmen && groesse < 430) {
        groesse += 4;
        el.style.fontSize = `${groesse}px`;
      }
      while (breite() > rahmen && groesse > 90) {
        groesse -= 4;
        el.style.fontSize = `${groesse}px`;
      }
    });
    await page.waitForTimeout(120);

    // ZAHLENBLOCK AUSMITTELN (Fund 13.08.2026): Auf festem Abstand von oben
    // klaffte zwischen Zahl und Textblock ein leeres Drittel - die Karte
    // zerfiel in zwei Hälften. Die Höhe des Textblocks schwankt aber mit der
    // Schlagzeile, ein fester Wert kann also gar nicht passen. Der Block wird
    // darum NACH dem Einpassen zwischen Trennlinie und Textblock zentriert.
    await page.evaluate(() => {
      const block = document.querySelector(".zahlblock");
      const stapel = document.querySelector(".stapel");
      const obenGrenze = 150; // unter der Trennlinie
      const untenGrenze = stapel.getBoundingClientRect().top - 70;
      const hoehe = block.getBoundingClientRect().height;
      const oben = obenGrenze + Math.max(0, (untenGrenze - obenGrenze - hoehe) / 2);
      block.style.top = `${Math.round(oben)}px`;
    });
    await page.waitForTimeout(80);

    const png = await page.screenshot();
    await mkdir(dirname(outPath), { recursive: true });
    await sharp(png).resize(1080, 1350).jpeg({ quality: 90 }).toFile(outPath);
  } finally {
    await browser.close();
    await rm(htmlFile, { force: true });
  }
  return outPath;
}
