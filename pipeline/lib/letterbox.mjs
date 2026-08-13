import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

// SCHWARZE BALKEN ENTFERNEN (Tim, 13.08.2026 — Halo-Post).
//
// WARUM: Der Halo-Post vom 13.08. hatte oben einen schwarzen Streifen. Das
// Artikelbild war sauber; der Balken kam aus dem offiziellen Artwork. Manche
// Steam- und IGDB-Grafiken stammen aus Zwischensequenzen und sind mit
// Letterbox gespeichert. Wir schneiden auf 4:5 zu — die Balken bleiben drin.
//
// Die Bild-Abnahme fängt das nicht: Sie prüft unsere Schrift, unsere Ränder,
// unser Logo. Ein schwarzer Streifen im Bild ist für sie formal einwandfrei.
// Tim musste den Post von Hand archivieren.
//
// WICHTIG — die Falle bei dieser Prüfung: Ein Bild mit dunklem, aber ECHTEM
// Inhalt am Rand (Nachthimmel, schwarze Rüstung, Schatten) darf NICHT
// beschnitten werden. Darum zwei Bedingungen statt einer: Die Zeile muss im
// Mittel fast schwarz sein UND ihr hellstes Pixel muss ebenfalls dunkel sein.
// Echter Bildinhalt hat fast immer irgendwo ein helleres Pixel; ein
// Letterbox-Balken hat keines.
//
// BEKANNTE GRENZE (ehrlich dokumentiert, nicht wegkalibriert): Ist ein Bild
// an BEIDEN Seiten dunkel und hat dort schmale Seitenbalken, ist die Kante
// nicht mehr messbar — dann wird nicht geschnitten. Beim Test blieb genau
// ein Fall übrig: 80 px Seitenbalken auf 1600 px Breite an einem durchweg
// dunklen Bild. Realistische Seitenbalken sind deutlich dicker (4:3 in 16:9
// ergibt rund 200 px) und werden erkannt; oben/unten funktioniert in jeder
// getesteten Stärke. Ich habe die Schwelle bewusst NICHT weiter gesenkt:
// Ein übersehener Balken kostet einen Post, ein fälschlich beschnittenes
// Bild zerstört das Motiv.

// Eine Zeile gilt als Balken, wenn ihr Mittelwert unter MITTEL liegt und
// selbst ihr hellstes Pixel unter SPITZE bleibt. Beide Werte sind bewusst
// streng: Lieber einen Balken übersehen als echten Bildinhalt abschneiden.
const MITTEL = 10;
const SPITZE = 34;

// Sicherheitsgrenze: Mehr als ein Drittel der Höhe (bzw. Breite) ist kein
// Balken mehr, sondern ein dunkles Bild. Dann wird nichts geschnitten.
const MAX_ANTEIL = 0.34;

// HARTE KANTE IST DAS ENTSCHEIDENDE MERKMAL (Korrektur 13.08.2026).
//
// Mein erster Versuch prüfte nur, ob die Randzeilen dunkel sind. Damit
// wollte er 309 px vom MSI-Grafikkarten-Foto abschneiden — einem dunklen
// Produktbild, das links schlicht ins Schwarz ausläuft. Es hätte echtes
// Bild zerstört.
//
// Ein Letterbox-Balken endet ABRUPT: Auf die letzte schwarze Zeile folgt
// sofort Bildinhalt. Dunkler Bildinhalt geht dagegen weich über. Darum wird
// jetzt zusätzlich die Helligkeit direkt hinter dem vermeintlichen Balken
// gemessen — ohne deutlichen Sprung wird nicht geschnitten.
//
// 15 statt urspruenglich 22 (Nachmessung 13.08.2026): Bei einem dunklen
// Testbild lag der Inhalt direkt hinter dem Balken bei 20.8 und fiel damit
// durch. Die eigentliche Trennarbeit leistet inzwischen die Paar-Regel
// weiter unten; diese Schwelle ist nur noch ein Boden gegen weiche
// Uebergaenge.
const KANTEN_SPRUNG = 15;

function zeilenWerte(data, breite, hoehe, richtung, pos) {
  const waagrecht = richtung === "oben" || richtung === "unten";
  const quer = waagrecht ? breite : hoehe;
  let summe = 0;
  let spitze = 0;
  for (let j = 0; j < quer; j++) {
    const wert = waagrecht ? data[pos * breite + j] : data[j * breite + pos];
    summe += wert;
    if (wert > spitze) spitze = wert;
  }
  return { mittel: summe / quer, spitze };
}

function balkenZaehlen(data, breite, hoehe, richtung) {
  const waagrecht = richtung === "oben" || richtung === "unten";
  const laenge = waagrecht ? hoehe : breite;
  const rueckwaerts = richtung === "unten" || richtung === "rechts";
  const posVon = (i) => (rueckwaerts ? laenge - 1 - i : i);

  let zahl = 0;
  for (let i = 0; i < laenge; i++) {
    const { mittel, spitze } = zeilenWerte(data, breite, hoehe, richtung, posVon(i));
    if (mittel < MITTEL && spitze < SPITZE) zahl++;
    else break;
  }
  if (zahl === 0) return { zahl: 0, kante: 0 };

  // Kantenstärke: Wie hell wird es direkt hinter dem Balken? Gemittelt über
  // fünf Zeilen, damit eine einzelne dunkle Zeile das Ergebnis nicht kippt.
  // Die Bewertung passiert bewusst NICHT hier, sondern erst nach der
  // Paar-Prüfung — siehe unten.
  let summe = 0;
  let n = 0;
  for (let k = 0; k < 5 && zahl + k < laenge; k++) {
    summe += zeilenWerte(data, breite, hoehe, richtung, posVon(zahl + k)).mittel;
    n++;
  }
  return { zahl, kante: n ? summe / n : 0 };
}

/**
 * Schneidet schwarze Ränder ab, falls vorhanden.
 * @param {string} pfad Bilddatei
 * @returns {Promise<{pfad: string, beschnitten: boolean, balken: object}>}
 *          pfad ist die Originaldatei, wenn nichts zu tun war — sonst eine
 *          neue Datei im temporären Verzeichnis.
 */
export async function entferneBalken(pfad) {
  const { data, info } = await sharp(pfad)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const breite = info.width;
  const hoehe = info.height;

  const roh = {
    oben: balkenZaehlen(data, breite, hoehe, "oben"),
    unten: balkenZaehlen(data, breite, hoehe, "unten"),
    links: balkenZaehlen(data, breite, hoehe, "links"),
    rechts: balkenZaehlen(data, breite, hoehe, "rechts"),
  };
  const balken = {
    oben: roh.oben.zahl, unten: roh.unten.zahl,
    links: roh.links.zahl, rechts: roh.rechts.zahl,
  };

  // Zu grosse "Balken" bedeuten ein durchgehend dunkles Bild — Finger weg.
  if (
    balken.oben + balken.unten > hoehe * MAX_ANTEIL ||
    balken.links + balken.rechts > breite * MAX_ANTEIL
  ) {
    return { pfad, beschnitten: false, balken, grund: "zu grossflaechig" };
  }

  // BALKEN TRETEN IMMER PAARWEISE AUF (Korrektur 13.08.2026).
  //
  // Letterbox entsteht, wenn ein Seitenverhältnis in ein anderes eingepasst
  // wird — dabei bleibt oben UND unten (oder links UND rechts) gleich viel
  // Rand. Eine einzelne dunkle Kante ist nie Letterbox, sondern Bildinhalt.
  //
  // Ohne diese Regel hätte die Prüfung 179 px vom AMD-Präsentationsbild
  // abgeschnitten (dunkler Folienhintergrund oben) und 309 px vom
  // MSI-Produktfoto (Schwarz, in das die Karte ausläuft).
  //
  // REIHENFOLGE (zweiter Fehler, gefunden beim Testen): Zuerst wurde die
  // Kante JE SEITE geprüft und erst danach das Paar gebildet. War der
  // Bildinhalt auf einer Seite dunkel, fiel diese Seite durch die
  // Kantenprüfung — und die Paar-Regel verwarf daraufhin BEIDE Balken.
  // Genau das passierte bei seitlichen Balken. Jetzt wird erst das Paar
  // gebildet, und die Kante muss nur auf EINER der beiden Seiten deutlich
  // sein.
  const paar = (a, b, ka, kb) => {
    if (a < 4 || b < 4) return [0, 0];
    if (Math.abs(a - b) > Math.max(a, b) * 0.3) return [0, 0];
    if (Math.max(ka, kb) < KANTEN_SPRUNG) return [0, 0];
    return [a, b];
  };
  const [oben, unten] = paar(balken.oben, balken.unten, roh.oben.kante, roh.unten.kante);
  const [links, rechts] = paar(balken.links, balken.rechts, roh.links.kante, roh.rechts.kante);
  if (!oben && !unten && !links && !rechts) {
    return { pfad, beschnitten: false, balken, grund: "kein Balkenpaar mit klarer Kante" };
  }

  const neueBreite = breite - links - rechts;
  const neueHoehe = hoehe - oben - unten;
  if (neueBreite < 200 || neueHoehe < 200) {
    return { pfad, beschnitten: false, balken, grund: "Rest zu klein" };
  }

  const ziel = join(tmpdir(), `rop-ohne-balken-${Date.now()}.jpg`);
  await sharp(pfad)
    .extract({ left: links, top: oben, width: neueBreite, height: neueHoehe })
    .jpeg({ quality: 95 })
    .toFile(ziel);
  return { pfad: ziel, beschnitten: true, balken };
}
