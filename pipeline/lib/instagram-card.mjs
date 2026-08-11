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

// MOTIV-SUCHER (Tim, 09.08.2026 — RDR2-Post): Steam-Cover tragen den
// Spieltitel fast immer im unteren Drittel, also genau dort, wo unsere
// Headline sitzt — zwei Schriften übereinander sind unlesbar. Statt stur
// die Bildmitte zu nehmen, probiert der Renderer mehrere senkrechte
// Ausschnitte durch und wählt den, bei dem die Kopfzeilen-Zone am
// RUHIGSTEN ist (wenig Struktur = kein Logo, kein Gesicht, keine Kante).
// Die Bild-Hierarchie bleibt davon unberührt — es geht nur darum, WIE
// ein gewähltes Bild im 4:5-Fenster liegt.
//
// Rückgabe: { position } in Prozent für object-position, { luminanz } und
// { unruhe } der gewählten Zone (Grundlage des Kontrast-Wächters).
export async function besterAusschnitt(imagePath) {
  const { width = 0, height = 0 } = await sharp(imagePath).metadata();
  if (!width || !height) return { position: 50, luminanz: 0, unruhe: 0 };

  // So gross wird das Bild im 1080×1350-Fenster (object-fit: cover).
  const skala = Math.max(1080 / width, 1350 / height);
  const sichtbarH = Math.min(height, Math.round(1350 / skala));
  const sichtbarB = Math.min(width, Math.round(1080 / skala));
  const spielraum = height - sichtbarH; // senkrecht verschiebbar

  // Kopfzeilen-Zone im fertigen Post: von 56 % bis 92 % der Höhe.
  const zoneOben = Math.round(sichtbarH * 0.56);
  const zoneHoehe = Math.max(8, Math.round(sichtbarH * 0.36));
  const links = Math.round((width - sichtbarB) / 2 + sichtbarB * 0.08);
  const breite = Math.max(8, Math.round(sichtbarB * 0.84));

  const messen = async (versatz) => {
    // WICHTIG (Fund 09.08.2026): sharp .stats() misst IMMER das
    // Eingangsbild und ignoriert ein vorangestelltes .extract() — der
    // Ausschnitt muss erst materialisiert werden. Der frühere
    // Kontrast-Wächter hatte genau diesen Fehler und mass seit jeher das
    // gesamte Bild statt der Zone hinter der Headline.
    const ausschnitt = await sharp(imagePath)
      .extract({
        left: links,
        top: Math.min(Math.max(0, versatz + zoneOben), height - zoneHoehe),
        width: breite,
        height: zoneHoehe,
      })
      .toBuffer();
    const stats = await sharp(ausschnitt).stats();
    const [r, g, b] = stats.channels;
    const luminanz = (0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean) / 255;
    // Standardabweichung = wie viel Struktur/Kontrast in der Zone steckt.
    const unruhe = (r.stdev + g.stdev + b.stdev) / 3 / 255;
    return { luminanz, unruhe };
  };

  // SCHNITT-WÄCHTER (Tim, 10.08.2026 — Aliens-Post): Der Sucher bewertete
  // nur die Ruhe HINTER der Headline und wusste nicht, was er am oberen
  // Bildrand zerschneidet. Beim Aliens-Cover gewann Position 100 % mit
  // 3 % ruhigerer Kopfzone — und sägte dafür mitten durch den Schriftzug.
  // Jetzt wird zusätzlich gemessen, wie viel Struktur direkt an der
  // Oberkante des Ausschnitts liegt: viel Struktur = wir schneiden durch
  // ein Logo, ein Gesicht, eine Kante. Nur die Oberkante zählt — die
  // Unterkante verschwindet ohnehin unter dem dunklen Verlauf.
  const schnittBand = Math.max(6, Math.round(sichtbarH * 0.05));
  const schnittkante = async (versatz) => {
    if (versatz <= 1) return 0; // Oberkante = Bildkante, es wird nichts zerschnitten
    const ausschnitt = await sharp(imagePath)
      .extract({ left: links, top: versatz, width: breite, height: schnittBand })
      .toBuffer();
    const stats = await sharp(ausschnitt).stats();
    const [r, g, b] = stats.channels;
    return (r.stdev + g.stdev + b.stdev) / 3 / 255;
  };

  if (spielraum <= 2) {
    const m = await messen(0);
    return { position: 50, ...m };
  }

  let beste = null;
  for (const anteil of [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1]) {
    const versatz = Math.round(spielraum * anteil);
    const m = await messen(versatz);
    const schnitt = await schnittkante(versatz);
    // Ein zerschnittenes Logo sticht sofort ins Auge, eine minim unruhigere
    // Kopfzone nicht — darum wiegt der Schnitt am schwersten. Danach Ruhe
    // hinter der Headline, dann Helligkeit; die Bildmitte bekommt einen
    // kleinen Bonus, damit wir nur bei echtem Gewinn abweichen.
    const strafe =
      schnitt * 2.0 + m.unruhe * 2.2 + m.luminanz * 0.5 + Math.abs(anteil - 0.5) * 0.06;
    if (!beste || strafe < beste.strafe) beste = { strafe, anteil, ...m };
  }
  return { position: Math.round(beste.anteil * 100), luminanz: beste.luminanz, unruhe: beste.unruhe };
}

// Kontrast-Wächter in drei Stufen: heller ODER unruhiger Hintergrund →
// der Verlauf beginnt früher und deckt stärker. Helligkeits-Schwelle
// empirisch (Testbilder 07.08.2026); die Unruhe-Schwelle kam am 09.08.2026
// dazu, weil auch ein dunkles Bild durch Strukturen (Logo, Kanten) unter
// der Schrift stören kann. Stufe 2 deckt fast vollständig ab — für Cover,
// deren Titel selbst im besten Ausschnitt noch in die Kopfzeilen-Zone ragt.
// Beitrag und Reel teilen sich diese Funktion, damit beide Formate eines
// Artikels identisch aussehen.
export function verlauf(luminanz, unruhe) {
  const stufe = luminanz > 0.6 || unruhe > 0.28 ? 2 : luminanz > 0.45 || unruhe > 0.18 ? 1 : 0;
  return [
    "linear-gradient(to bottom, rgba(12,11,26,0) 48%, rgba(12,11,26,0.62) 72%, rgba(12,11,26,0.96) 90%, #0C0B1A 100%)",
    "linear-gradient(to bottom, rgba(12,11,26,0) 40%, rgba(12,11,26,0.78) 66%, rgba(12,11,26,0.97) 88%, #0C0B1A 100%)",
    "linear-gradient(to bottom, rgba(12,11,26,0) 32%, rgba(12,11,26,0.62) 50%, rgba(12,11,26,0.93) 66%, rgba(12,11,26,0.995) 80%, #0C0B1A 92%)",
  ][stufe];
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// headlineLines: Array von Zeilen; jede Zeile ist ein Array von Segmenten
// { text, cyan } — die Struktur kommt von Claude, das HTML bauen wir selbst.
// JEDE ZEILE UNUMBRECHBAR (Tim, 11.08.2026): Vorher wurden die Zeilen mit
// <br> aneinandergehängt und durften umbrechen. Eine zu lange Zeile wurde
// dadurch heimlich zu zweien — so entstand beim Halloween-Post der Bruch
// "WEGEN MARIHUANA-" / "MECHANIK" mit einem einzelnen Wort auf der letzten
// Zeile. Jetzt steht jede Zeile in einem eigenen Block mit nowrap; passt sie
// nicht, wird die Schrift verkleinert (siehe schriftEinpassen) statt
// umgebrochen. Die Zeilenzahl der Grafik entspricht damit IMMER der, die die
// Redaktion vorgegeben hat.
export function headlineHtml(headlineLines) {
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

// Verkleinert die Schlagzeile so weit, bis jede Zeile in die Breite passt
// und der Block die Höhenvorgabe einhält. Wird im Seitenkontext ausgeführt.
export function schriftEinpassenQuelle() {
  return (maxHoehe) => {
    const titel = document.querySelector(".titel");
    if (!titel) return { groesse: null, passt: true };
    const zeilen = [...titel.querySelectorAll(".zeile")];
    // 96 % der verfügbaren Breite: Die längste Zeile soll den Satzspiegel
    // nicht bis auf den letzten Pixel ausreizen — randberührender Text wirkt
    // gedrängt, auch wenn er formal passt.
    const breite = titel.clientWidth * 0.96;
    let groesse = parseFloat(getComputedStyle(titel).fontSize);
    const MIN = 38;
    // TEXTBREITE PER RANGE MESSEN (Fund 11.08.2026): scrollWidth liefert bei
    // einem Block-Element die Container-Breite statt der Textbreite — die
    // Bedingung wäre nie erfüllbar und die Schrift würde immer bis zum
    // Anschlag schrumpfen, auch bei kurzen Schlagzeilen.
    const textBreite = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().width;
    };
    const passt = () =>
      zeilen.every((z) => textBreite(z) <= breite + 0.5) &&
      (!maxHoehe || titel.getBoundingClientRect().height <= maxHoehe);
    while (!passt() && groesse > MIN) {
      groesse -= 1;
      titel.style.fontSize = `${groesse}px`;
    }
    return { groesse, passt: passt(), zeilen: zeilen.length };
  };
}

export async function renderInstagramCard({
  headlineLines,
  badge, // null | "BREAKING" | "REVIEW"
  imagePath, // absoluter Pfad zum 4:5-Portrait (oder 16:9-Fallback)
  credit, // z. B. "Bild: GameSpot"; null → "KI-Symbolbild"
  outPath, // absoluter Zielpfad (.jpg)
  chromium, // playwright.chromium (injiziert, damit der Import zentral bleibt)
}) {
  const { position, luminanz, unruhe } = await besterAusschnitt(imagePath);
  const grad = verlauf(luminanz, unruhe);

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
  .bild img { width:100%; height:100%; object-fit:cover; object-position:50% ${position}%; display:block; }
  .bild::after { content:""; position:absolute; inset:0; background:${grad}; }
  .stapel { position:absolute; left:60px; right:60px; bottom:${G + LOGO_H + G}px;
    display:flex; flex-direction:column; align-items:center; gap:30px; }
  .titel { font-family:'Inter',sans-serif; font-weight:900; text-transform:uppercase;
    text-align:center; font-size:64px; line-height:1.18; letter-spacing:-0.015em;
    color:#FFFFFF; text-shadow:0 3px 18px rgba(0,0,0,0.5); }
  .titel .zeile { display:block; white-space:nowrap; }
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

    // Schrift einpassen, BEVOR die Tintenkompensation misst — sonst rechnet
    // sie mit der alten Grösse. Höhenvorgabe 430 px: Damit bleibt der obere
    // Bildteil in jedem Fall sichtbar und der Block drängt sich nie ans Logo.
    const einpassung = await page.evaluate(
      `(${schriftEinpassenQuelle().toString()})(430)`,
    );
    if (!einpassung.passt) {
      console.log(
        `  Hinweis: Schlagzeile passt auch bei ${einpassung.groesse}px nicht vollständig (${einpassung.zeilen} Zeilen)`,
      );
    }
    await page.waitForTimeout(80);

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
