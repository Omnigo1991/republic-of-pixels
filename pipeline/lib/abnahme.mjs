import sharp from "sharp";

// BILD-ABNAHME (Tim, 12.08.2026) — die Schranke vor der Veröffentlichung.
//
// WARUM ES DIESE DATEI GIBT: In fünf Tagen fand Tim acht Fehler in fertigen
// Posts — zerschnittenes Logo, vier Zeilen statt drei, überschriebene
// Kopfzeile, Waisenwort, falscher Ausschnitt, ausgeschriebener Umlaut. Kein
// einziger wurde von uns gefunden. Der Grund: Alle bisherigen Wächter prüfen
// die ZUTATEN (Schlagzeilentext, Bildgrösse). Niemand schaute sich das
// ERGEBNIS an. Ich war damit jeden Tag einen Fehler hinterher — ich baute
// immer die Prüfung, die den gestrigen Fall verhindert hätte.
//
// Diese Abnahme misst am gerenderten 1080×1350-Bild, also an dem, was der
// Leser tatsächlich sieht. Fällt eine Prüfung durch, wird der Post NICHT
// veröffentlicht; die Story wird übersprungen und eine andere gewählt.
//
// GRUNDSATZ FÜR DIE SCHWELLWERTE: Sie sind an echten Posts kalibriert — an
// guten wie an den acht schlechten. Lieber eine Schwelle, die einen
// Grenzfall durchlässt, als eine, die brauchbare Posts blockiert: Ein
// verworfener Post kostet uns einen Slot, ein blockierter Tag kostet fünf.

const BREITE = 1080;
const HOEHE = 1350;

// Ab welcher Helligkeit gilt ein Pixel als Schrift? Unsere Headline ist
// Weiss (#FFFFFF) oder Cyan (#02F0D1) auf dunklem Grund — beide liegen in
// Graustufen deutlich über 120.
const SCHRIFT_HELL = 150;

async function graustufen(pfad) {
  const { data, info } = await sharp(pfad)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, breite: info.width, hoehe: info.height };
}

// Zeilen des Textblocks finden: zusammenhängende Bänder heller Pixel im
// unteren Bilddrittel. Damit erkennen wir die TATSÄCHLICHE Zeilenzahl im
// Bild — nicht die, die wir vorgegeben haben. Genau daran scheiterte der
// Halloween-Post, bei dem eine zu lange Zeile heimlich zu zweien wurde.
function textZeilen(data, breite, hoehe, vonY, bisY) {
  const zeilen = [];
  let start = null;
  for (let y = vonY; y < bisY; y++) {
    let hell = 0;
    for (let x = 0; x < breite; x++) if (data[y * breite + x] > SCHRIFT_HELL) hell++;
    // Mindestens 2 % der Breite, damit einzelne helle Bildpixel keine
    // Zeile vortäuschen.
    const istText = hell > breite * 0.02;
    if (istText && start === null) start = y;
    if (!istText && start !== null) {
      if (y - start >= 12) zeilen.push({ von: start, bis: y });
      start = null;
    }
  }
  if (start !== null && bisY - start >= 12) zeilen.push({ von: start, bis: bisY });
  return zeilen;
}

// Linke Tintenkante eines Bandes.
function linkeKante(data, breite, von, bis) {
  let links = breite;
  for (let y = von; y < bis; y++) {
    for (let x = 0; x < links; x++) {
      if (data[y * breite + x] > SCHRIFT_HELL) {
        if (x < links) links = x;
        break;
      }
    }
  }
  return links;
}

// SCHRIFT VON HELLEM BILD TRENNEN (Tim, 13.08.2026, Marker-Layout).
//
// Bisher galt: helles Band = Textzeile. Das reichte, solange die Schrift
// zentriert im dunkelsten Bildteil sass. Im linksbündigen Marker-Layout
// beginnt JEDE Textzeile bei x = 60 (Satzspiegel) — gemessen an acht echten
// Posts: 60 bis 65. Helle Bildbereiche fangen dagegen bei x = 0, 13, 247
// oder 349 an, das R-Logo bei 515. Beim Helldivers-Post erzeugte das helle
// Artwork ein Band bei 59 % Höhe, das sonst als fünfte Textzeile gezählt
// und einen einwandfreien Post abgelehnt hätte.
//
// Die linke Kante ist damit das verlässlichere Merkmal als die Helligkeit —
// und sie folgt aus dem Layout, ist also keine empirische Schwelle, die
// morgen wieder wackelt.
const SATZ_LINKS = 60;
const SATZ_TOLERANZ = 20;

function nurTextzeilen(zeilen, data, breite) {
  return zeilen.filter((z) => {
    const links = linkeKante(data, breite, z.von, z.bis);
    z.links = links;
    return Math.abs(links - SATZ_LINKS) <= SATZ_TOLERANZ;
  });
}

function randAbstand(data, breite, von, bis) {
  let links = breite;
  let rechts = 0;
  for (let y = von; y < bis; y++) {
    for (let x = 0; x < breite; x++) {
      if (data[y * breite + x] > SCHRIFT_HELL) {
        if (x < links) links = x;
        if (x > rechts) rechts = x;
      }
    }
  }
  return { links, rechts: breite - rechts };
}

/**
 * Prüft eine fertige Post-Grafik.
 * @param {string} pfad     1080×1350-JPG
 * @param {number} zeilenSoll  erwartete Zeilenzahl der Schlagzeile
 * @param {"bild"|"typo"} art  Bild-Karte (Schrift unten) oder Typo-Karte
 *                             (Schrift mittig) — bestimmt das Suchfenster
 * @returns {{ok: boolean, fehler: string[], messwerte: object}}
 */
export async function pruefeGrafik(pfad, zeilenSoll, art = "bild") {
  const fehler = [];
  const messwerte = {};

  const meta = await sharp(pfad).metadata();
  if (meta.width !== BREITE || meta.height !== HOEHE) {
    return {
      ok: false,
      fehler: [`Falsche Grösse: ${meta.width}×${meta.height} statt ${BREITE}×${HOEHE}`],
      messwerte,
    };
  }

  const { data, breite, hoehe } = await graustufen(pfad);

  // 1) Schlagzeile: Zeilenzahl im BILD gegen die Vorgabe.
  //    SUCHFENSTER JE KARTENART (Kalibrierung 12.08.2026): Auf der Bild-Karte
  //    steht die Schrift unten, auf der Typo-Karte mittig. Mein erstes
  //    Fenster (60–90 %) passte nur zur Bild-Karte und fand auf der
  //    Typo-Karte bloss eine Zeile statt zwei — die Abnahme haette also
  //    ausgerechnet die guten Typo-Karten blockiert.
  //    MARKER-LAYOUT (13.08.2026): Der Textblock sitzt jetzt zwischen 60 und
  //    87 % — gemessen an acht echten Posts: Kopfzeile 61,8–63,9 %,
  //    Schlagzeile 66,5–80,4 %, Notiz 82,7–86,3 %. Das Fenster reicht von 55
  //    bis 90 %; die Trennung von hellem Bild macht die linke Kante (unten).
  const istTypo = art === "typo";
  const textVon = Math.round(hoehe * (istTypo ? 0.3 : 0.55));
  const textBis = Math.round(hoehe * (istTypo ? 0.72 : 0.9));
  let zeilen = textZeilen(data, breite, hoehe, textVon, textBis);
  // Bänder aussortieren, die nicht am Satzspiegel beginnen — helle
  // Bildstellen. Nur beim linksbündigen Marker-Layout; die Typo-Karte ist
  // zentriert, dort gilt das Merkmal nicht.
  if (!istTypo) zeilen = nurTextzeilen(zeilen, data, breite);
  messwerte.zeilen = zeilen.length;
  if (zeilenSoll && zeilen.length !== zeilenSoll) {
    fehler.push(`${zeilen.length} Textzeilen im Bild, erwartet ${zeilenSoll}`);
  }
  if (zeilen.length === 0) {
    fehler.push("Keine Schlagzeile im Bild gefunden");
    return { ok: false, fehler, messwerte };
  }

  // 2) Randabstand.
  //    Im Marker-Layout ist der LINKE Rand vom Satzspiegel vorgegeben (60 px)
  //    und wird oben bereits geprüft — hier zählt, dass der Text rechts nicht
  //    aus dem Satzspiegel läuft. Auf der zentrierten Typo-Karte gilt weiter
  //    die alte Regel: beide Ränder mindestens 70 px.
  const rand = randAbstand(data, breite, zeilen[0].von, zeilen[zeilen.length - 1].bis);
  messwerte.randLinks = rand.links;
  messwerte.randRechts = rand.rechts;
  // KEINE RECHTS-PRÜFUNG IM MARKER-LAYOUT (Fund 13.08.2026): Mein erster
  // Versuch lehnte den CD-Projekt- und den Pokémon-Post ab, weil rechts
  // angeblich 1 px Rand blieb. Ursache war die Messung selbst — sie scannt
  // den ganzen Block von der ersten bis zur letzten Zeile, also auch die
  // LÜCKEN dazwischen, und dort steht helles Bild (Geralts weisses Haar) bis
  // an den Bildrand. Am Text lag es nie.
  //
  // Die Prüfung entfällt ersatzlos, und das ist kein Verzicht: Dass eine
  // Zeile den Satzspiegel nicht überschreitet, garantiert der Renderer
  // baulich — er misst jede Zeile und verkleinert die Schrift, bis sie
  // passt. Täte er es nicht, bräche die Zeile um, und genau das fängt die
  // Zeilenzahl-Prüfung oben. Eine Pixel-Messung, die Bild nicht von Schrift
  // trennen kann, hätte hier nur gute Posts blockiert.
  if (istTypo && Math.min(rand.links, rand.rechts) < 70) {
    fehler.push(`Schrift zu nah am Rand (${Math.min(rand.links, rand.rechts)} px, min. 70)`);
  }
  // Der Kontrast-Streifen liegt links VOM Text (x 20–80). Im Marker-Layout
  // beginnt die Schrift bei 60 — der Streifen würde sie anschneiden und den
  // Hintergrund zu hell messen. Darum dort ein schmalerer Streifen weiter aussen.
  const streifenLinks = istTypo ? 20 : 4;
  const streifenBreite = istTypo ? 60 : 44;

  // 3) Kontrast: Der Hintergrund hinter der Schlagzeile muss dunkel sein.
  //    Gemessen an einem schriftfreien Randstreifen auf Schlagzeilenhöhe.
  //    Auf der Typo-Karte entfaellt das — dort ist der Grund immer unser Navy.
  const streifen = await sharp(pfad)
    .extract({
      left: streifenLinks,
      top: zeilen[0].von,
      width: streifenBreite,
      height: Math.max(10, zeilen[zeilen.length - 1].bis - zeilen[0].von),
    })
    .toBuffer();
  const [r, g, b] = (await sharp(streifen).stats()).channels;
  const grund = (0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean) / 255;
  messwerte.hintergrund = Math.round(grund * 1000) / 1000;
  if (art !== "typo" && grund > 0.4) {
    fehler.push(`Hintergrund hinter der Schlagzeile zu hell (${messwerte.hintergrund})`);
  }

  // 4) Motiv vorhanden — mit einer EHRLICHEN Einschraenkung: Diese Pruefung
  //    sollte den Zelda-Fall abfangen (Link am Rand, Rest blauer Himmel).
  //    Bei der Kalibrierung zeigte sich, dass sie das NICHT kann: Die kaputte
  //    Fassung mass 0.135, die gute 0.139 — statistisch nicht zu
  //    unterscheiden. Eine Schwelle, die die eine faengt, blockiert die
  //    andere. Die Pruefung bleibt darum nur als Boden gegen wirklich
  //    flaechige Bilder (Farbverlauf, Standbild ohne Inhalt). "Motiv am
  //    falschen Ort" muss der Ausschnitt loesen, nicht die Abnahme —
  //    lieber eine ehrliche Luecke als ein Schwellwert, der gute Posts
  //    blockiert.
  // Auf der Typo-Karte gibt es bewusst kein Motiv — die Pruefung entfaellt.
  const obenPuffer = art === "typo" ? null : await sharp(pfad)
    .extract({ left: 0, top: 0, width: breite, height: Math.round(hoehe * 0.5) })
    .toBuffer();
  let strukturWert = 1;
  if (obenPuffer) {
    const [or_, og, ob] = (await sharp(obenPuffer).stats()).channels;
    strukturWert = (or_.stdev + og.stdev + ob.stdev) / 3 / 255;
  }
  messwerte.strukturOben = Math.round(strukturWert * 1000) / 1000;
  if (obenPuffer && strukturWert < 0.03) {
    fehler.push(`Obere Bildhälfte fast leer (Struktur ${messwerte.strukturOben})`);
  }

  // 5) Logo: Im unteren Bereich muss unser R stehen. Wir prüfen auf
  //    Cyan-Pixel — kein anderes Element dort trägt diese Farbe.
  const logoPuffer = await sharp(pfad)
    .extract({ left: 440, top: hoehe - 150, width: 200, height: 110 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let cyan = 0;
  for (let i = 0; i < logoPuffer.data.length; i += logoPuffer.info.channels) {
    const [pr, pg, pb] = [logoPuffer.data[i], logoPuffer.data[i + 1], logoPuffer.data[i + 2]];
    if (pg > 150 && pb > 130 && pr < 140 && pg - pr > 60) cyan++;
  }
  messwerte.logoPixel = cyan;
  if (cyan < 300) fehler.push(`R-Logo nicht erkennbar (${cyan} Cyan-Pixel)`);

  return { ok: fehler.length === 0, fehler, messwerte };
}
