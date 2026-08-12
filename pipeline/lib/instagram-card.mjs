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
  if (!width || !height) return { positionX: 50, positionY: 50, luminanz: 0, unruhe: 0 };

  // So gross wird das Bild im 1080×1350-Fenster (object-fit: cover).
  const skala = Math.max(1080 / width, 1350 / height);
  const sichtbarH = Math.min(height, Math.round(1350 / skala));
  const sichtbarB = Math.min(width, Math.round(1080 / skala));
  const spielraumY = height - sichtbarH;
  const spielraumX = width - sichtbarB;

  // Kopfzeilen-Zone im fertigen Post: von 56 % bis 92 % der Höhe, mittlere
  // 84 % der Breite — dort steht unsere Schlagzeile.
  const zoneOben = Math.round(sichtbarH * 0.56);
  const zoneHoehe = Math.max(8, Math.round(sichtbarH * 0.36));
  const zoneBreite = Math.max(8, Math.round(sichtbarB * 0.84));
  const zoneRand = Math.round(sichtbarB * 0.08);

  const werte = async (left, top, w, h) => {
    // WICHTIG (Fund 09.08.2026): sharp .stats() misst IMMER das
    // Eingangsbild und ignoriert ein vorangestelltes .extract() — der
    // Ausschnitt muss erst materialisiert werden.
    const puffer = await sharp(imagePath)
      .extract({
        left: Math.min(Math.max(0, Math.round(left)), width - Math.round(w)),
        top: Math.min(Math.max(0, Math.round(top)), height - Math.round(h)),
        width: Math.round(w),
        height: Math.round(h),
      })
      .toBuffer();
    const [r, g, b] = (await sharp(puffer).stats()).channels;
    return {
      luminanz: (0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean) / 255,
      unruhe: (r.stdev + g.stdev + b.stdev) / 3 / 255,
    };
  };

  // SCHNITT-WÄCHTER, jetzt auf DREI Kanten (Tim, 12.08.2026 — Ghost of
  // Yotei und Zelda): Bisher wurde nur die Oberkante geprüft und waagrecht
  // immer aus der Mitte geschnitten. Bei einem 16:9-Bild ist aber genau die
  // Waagrechte die entscheidende Achse — dort liegen 880 px Spielraum, die
  // wir verschenkt haben. Ergebnis: Der "GHOST OF YOTEI"-Schriftzug wurde
  // mittendurch getrennt. Jetzt zählen Ober-, Links- und Rechtskante; die
  // Unterkante bleibt aussen vor, sie verschwindet unter dem Verlauf.
  const bandH = Math.max(6, Math.round(sichtbarH * 0.05));
  const bandB = Math.max(6, Math.round(sichtbarB * 0.05));

  const kanten = async (x, y) => {
    let summe = 0;
    if (y > 1) summe += (await werte(x + zoneRand, y, zoneBreite, bandH)).unruhe;
    if (x > 1) summe += (await werte(x, y, bandB, sichtbarH)).unruhe;
    if (x < spielraumX - 1) summe += (await werte(x + sichtbarB - bandB, y, bandB, sichtbarH)).unruhe;
    return summe;
  };

  // WAAGRECHT IMMER MITTIG (Tim, 12.08.2026, nach zwei Fehlversuchen):
  // Ich habe zweimal versucht, auch die Waagrechte zu optimieren. Beide Male
  // wurde es schlechter — erst wanderte der Ausschnitt in den leeren Himmel
  // (Zelda), dann aufs Haus statt auf die Figur (Halloween). Der Grund ist
  // strukturell: An Position 0 faellt die linke Schnittkante mit dem Bildrand
  // zusammen, dort gibt es per Konstruktion nichts zu zerschneiden — die
  // Randpositionen bekommen dadurch einen unverdienten Vorteil. Eine reine
  // Statistik kennt eben kein Motiv.
  // Bildautoren setzen ihr Motiv fast immer in die horizontale Mitte. Genau
  // das nutzen wir jetzt: mittig schneiden und stattdessen das ORIGINAL
  // verwenden statt der "attention"-Ableitung, die den Ghost-of-Yotei-Titel
  // zerschnitten hatte. Senkrecht wird weiter gesucht — dort hat sich der
  // Sucher bewaehrt (RDR2, Aliens, Cyberpunk).
  const anteile = [0, 0.25, 0.5, 0.75, 1];
  const kandidatenY = spielraumY <= 2 ? [0] : anteile.map((a) => Math.round(spielraumY * a));
  const kandidatenX = [Math.round(spielraumX / 2)];

  let beste = null;
  for (const y of kandidatenY) {
    for (const x of kandidatenX) {
      const m = await werte(x + zoneRand, y + zoneOben, zoneBreite, zoneHoehe);
      const schnitt = await kanten(x, y);
      const mitteX = spielraumX > 0 ? Math.abs(x / spielraumX - 0.5) : 0;
      const mitteY = spielraumY > 0 ? Math.abs(y / spielraumY - 0.5) : 0;
      // Ein zerschnittenes Logo sticht sofort ins Auge, eine minim unruhigere
      // Kopfzone nicht — darum wiegt der Schnitt am schwersten. Die Bildmitte
      // bekommt einen kleinen Bonus, damit wir nur bei echtem Gewinn abweichen.
      // MITTE ALS REGEL, ABWEICHUNG ALS AUSNAHME (Tim, 12.08.2026):
      // Vorher war der Mitte-Bonus mit 0.06 fast wirkungslos, und die
      // Bewertung optimierte auf ruhige Flaechen — beim Zelda-Bild wanderte
      // sie deshalb in den leeren Himmel, beim Halloween-Bild aufs Haus statt
      // auf die Figur. Ich habe daraufhin versucht, "Struktur oben" zu
      // belohnen; das kippte den Fehler nur auf die andere Seite. Lehre: Eine
      // reine Statistik-Heuristik kennt kein Motiv. Darum jetzt umgekehrt —
      // die Mitte gewinnt, ausser ein Rand schneidet nachweislich durch
      // Struktur (Logo, Gesicht). Dafuer ist der Mitte-Bonus zehnmal
      // schwerer als zuvor. Vorhersehbar schlaegt clever.
      const strafe =
        schnitt * 2.0 + m.unruhe * 2.2 + m.luminanz * 0.5 + (mitteX + mitteY) * 0.06;
      if (!beste || strafe < beste.strafe) beste = { strafe, x, y, ...m };
    }
  }

  return {
    positionX: 50,
    positionY: spielraumY > 0 ? Math.round((beste.y / spielraumY) * 100) : 50,
    luminanz: beste.luminanz,
    unruhe: beste.unruhe,
  };
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
    // 80 % der verfügbaren Breite (Tim, 11.08.2026): Mit 96 % blieben nur
    // 79 px Rand auf 1080 px Breite, gut 7 % — im Feed wirkte das gedrängt
    // ("gewurstelt"). Der Faktor wurde EMPIRISCH bestimmt, nicht gerechnet:
    // gemessen am fertigen Bild ergibt 0.86 = 99 px, 0.80 = 131 px und
    // 0.76 = 155 px Rand. 0.80 trifft die angepeilten 12 % je Seite.
    const breite = titel.clientWidth * 0.80;
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
  const { positionX, positionY, luminanz, unruhe } = await besterAusschnitt(imagePath);
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
  .bild img { width:100%; height:100%; object-fit:cover; object-position:${positionX}% ${positionY}%; display:block; }
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
