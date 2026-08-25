import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { askClaude, parseJsonResponse, MODELL_URTEIL, ClaudeAblehnung } from "./claude.mjs";
import { entferneBalken } from "./letterbox.mjs";
import { besterAusschnitt } from "./instagram-card.mjs";

// DAS BILD-TOR (Tim, 14.08.2026).
//
// WARUM ES DAS GIBT: Am 13. und 14.08. hat Tim aus zwei Testrunden dieselbe
// Lehre gezogen - unsere Wächter prüfen ZUTATEN, nie das ERGEBNIS. Für Bilder
// heisst das konkret: Wir prüfen die Quellhöhe (>= 900 px) und schneiden dann
// nach einer Varianz-Heuristik zu. Ob am Ende die Figur im Bild ist, ob das
// Motiv überhaupt zur Schlagzeile passt und ob der Ausschnitt etwas taugt,
// hat noch nie jemand nachgesehen.
//
// Tims drei Kriterien im Wortlaut: "A) die Auflösung stimmen, B) das Sujet
// passen, C) die Szene attraktiv dargestellt werden können (Ausrichtung,
// Zoom, Auflösung, Lesbarkeit des Headers etc.)."
//
// Dieses Modul prüft alle drei - und zwar am fertigen 1080×1350-Ausschnitt,
// also an genau dem Bild, das die Leute sehen. Ein 1920×1080-Bild kann einen
// miserablen 4:5-Ausschnitt ergeben; Tomb Raider hatte im Test die beste
// Auflösung von allen und das schlechteste Ergebnis.
//
// WARUM CLAUDE HINSCHAUT STATT EINER FORMEL: Zweimal habe ich versucht,
// "ist die Figur im Bild" mit Statistik zu lösen (Varianz, Struktur,
// Unruhe). Beide Male hat es das Falsche gewählt - bei Zelda den leeren
// Himmel, bei Halloween das Haus statt Michael Myers. Eine Heuristik kennt
// kein Motiv. Also fragen wir jemanden, der sehen kann.

// A) AUFLÖSUNG - gemessen am ERGEBNIS, nicht an der Quelle.
//
// Die bestehende 900-px-Prüfung schaut auf die Quellhöhe. Ein Bild kann die
// bestehen und trotzdem stark hochgerechnet im Post landen, weil der 4:5-
// Ausschnitt nur einen Teil davon nutzt. Darum messen wir hier, um wieviel
// der gewählte Ausschnitt auf 1080×1350 aufgeblasen werden muss.
//
// WIE DIE GRENZE ZUSTANDE KOMMT (nachgerechnet 14.08.2026, nachdem mein
// erster Wert fast alles verworfen hätte):
//
// Für ein 16:9-Bild gilt exakt: Vergrösserung = 1350 / Quellhöhe. Das heisst,
// die bestehende 900-px-Regel IST bereits eine 1.5x-Grenze - nur eben an der
// Quelle gemessen statt am Ergebnis. Ein paar Beispiele:
//
//   1920 x 1080  ->  1.25x   (sehr gut)
//   1600 x 900   ->  1.50x   (unsere Standardgrösse, von Tim vielfach abgenommen)
//   1024 x 1024  ->  1.32x   (das Bären-Bild, Tim: "in Ordnung")
//    901 x 505   ->  2.67x   (GTA 6, Tim: "Auflösung schlecht")
//
// Mein erster Wert war 1.35 - der hätte 1600 x 900 verworfen, also praktisch
// jedes Artikelbild und die meisten Steam-Screenshots. Der Prüflauf hat es
// gefunden, bevor es einen Post gekostet hat.
//
// 1.6 entspricht rund 845 px Quellhöhe bei 16:9. Das ist Tims "Mindestgüte
// etwas lockerer als die bisherigen 900 px" - und zugleich sein "lockerer
// heisst ein paar Pixel unter der Grenze, nicht 505 statt 900". GTA 6 fällt
// mit 2.67x weiterhin klar durch.
//
// Der Gewinn gegenüber der alten Quellhöhen-Regel: Diese Messung gilt für
// JEDES Seitenverhältnis. Ein 3000 x 900-Panorama besteht die 900-px-Regel,
// liefert aber einen miserablen 4:5-Ausschnitt - hier fällt es durch.
export const MAX_VERGROESSERUNG = 1.6;

// Vorschaugrösse für die Beurteilung. Halbe Kantenlänge des fertigen Posts:
// genug, um Figur, Ausrichtung und Schärfe zu beurteilen, und ein Viertel
// der Bildpunkte - also ein Viertel der Kosten.
const VORSCHAU_B = 540;
const VORSCHAU_H = 675;

const SYSTEM = `Du bist Bildredaktion eines deutschsprachigen Gaming-Magazins und beurteilst Instagram-Posts im Format 1080x1350. Du bist streng, aber nicht unmöglich: Wir brauchen taeglich vier bis fuenf Posts, koennen also nicht auf das perfekte Bild warten - aber ein schwacher Post ist schlimmer als ein fehlender. Du antwortest ausschliesslich mit JSON.`;

/**
 * Erzeugt den Ausschnitt, den der Renderer spaeter zeigen wuerde.
 *
 * WICHTIG: Hier wird bewusst dieselbe Logik benutzt wie im Renderer
 * (entferneBalken + besterAusschnitt + object-fit-cover-Rechnung). Wuerden
 * wir anders zuschneiden, beurteilte Claude ein Bild, das so nie erscheint -
 * und wir haetten wieder einen Waechter, der etwas anderes prueft als das,
 * was am Ende herauskommt. Genau dieser Fehler hat uns die erste Woche
 * gekostet.
 */
async function fertigerAusschnitt(pfad, zielPfad, xVorgabe = null) {
  const balkenfrei = await entferneBalken(pfad);
  const quelle = balkenfrei.pfad;

  const { width = 0, height = 0 } = await sharp(quelle).metadata();
  if (!width || !height) return null;

  const gefunden = await besterAusschnitt(quelle);
  const positionY = gefunden.positionY;
  const positionX = xVorgabe ?? gefunden.positionX;

  // object-fit: cover - dieselbe Rechnung wie im Browser.
  const skala = Math.max(1080 / width, 1350 / height);
  const sichtbarB = Math.min(width, Math.round(1080 / skala));
  const sichtbarH = Math.min(height, Math.round(1350 / skala));
  const left = Math.round((width - sichtbarB) * (positionX / 100));
  const top = Math.round((height - sichtbarH) * (positionY / 100));

  await sharp(quelle)
    .extract({ left, top, width: sichtbarB, height: sichtbarH })
    .resize(VORSCHAU_B, VORSCHAU_H, { fit: "fill" })
    .jpeg({ quality: 82 })
    .toFile(zielPfad);

  return {
    vorschau: zielPfad,
    balkenEntfernt: balkenfrei.beschnitten,
    // Wieviel muss der Ausschnitt fuer den fertigen Post aufgeblasen werden?
    vergroesserung: 1080 / sichtbarB,
    sichtbarB,
    sichtbarH,
    positionX,
    positionY,
    // Bleibt waagrecht ueberhaupt Spielraum? Nur dann lohnen Varianten.
    spielraumX: width - sichtbarB,
  };
}

// AUSSCHNITTE STATT NUR BILDER BEURTEILEN (Tim, 24.08.2026:
// "die Bilder muessen perfekt geschnitten sein").
//
// NACHGEMESSEN AN 60 ECHTEN ARTIKELBILDERN: Alle 60 sind Querformat. Bei
// Querformat ist der SENKRECHTE Spielraum im 4:5-Fenster exakt null - die
// Hoehe passt aufs Pixel, es gibt nichts zu verschieben. Genau auf dieser
// Achse sucht besterAusschnitt. Waagrecht dagegen fallen im Median 55 %
// der Bildbreite weg, und diese Achse steht seit dem 12.08. fest auf
// "immer mittig". Ergebnis: Der Schnitt-Waechter hat bei allen 60 Bildern
// dieselbe Position gewaehlt wie gar kein Waechter.
//
// Der Grund fuer "immer mittig" war richtig und gilt weiter: Zwei Versuche,
// die Waagrechte per Statistik zu optimieren, haben es schlechter gemacht
// (Zelda: leerer Himmel, Halloween: Haus statt Figur). Eine Formel kennt
// kein Motiv.
//
// Aber dieses Tor fragt jemanden, der sehen kann. Also legen wir dem
// Modell die Varianten nebeneinander und lassen es entscheiden - dieselbe
// Antwort, die wir bei der Bildwahl schon geben lassen. Keine neue
// Heuristik, kein zusaetzlicher Modellaufruf: Die Varianten treten einfach
// als weitere Kandidaten an.
//
// Mitte bleibt dabei die erste Variante. Wenn keine der seitlichen besser
// aussieht, gewinnt sie - Abweichung bleibt die Ausnahme.
const X_VARIANTEN = [50, 22, 78];

// Deckel fuer die Zahl der Ausschnitte, die dem Modell gezeigt werden.
// Jedes Bild kostet Rechenzeit und Geld; neun ist genug, um echte Auswahl
// zu haben, ohne dass ein Post das Doppelte kostet.
const MAX_ANSICHTEN = 9;

/**
 * Beurteilt mehrere Bildkandidaten und liefert den besten - oder keinen.
 *
 * @param {object}   o
 * @param {Array}    o.kandidaten  [{ pfad, credit, herkunft }]
 * @param {string}   o.schlagzeile Die Schlagzeile des Posts (fuer "passt das Sujet?")
 * @param {string}  [o.spielName]  Spielname, falls bekannt
 * @returns {Promise<{gewaehlt: object|null, grund: string, geprueft: number}>}
 *          gewaehlt ist null, wenn KEIN Kandidat taugt. Dann zieht der Aufrufer
 *          die naechste Story - nicht eine Typo-Karte (Tim, 14.08.2026:
 *          "Wir sind keine Typo-Account").
 */
// WO LIEGT DAS MOTIV? (Tim, 23.08.2026)
//
// Der Textblock deckt das untere Drittel des Posts ab, oben rechts sitzt
// unser Zeichen. Ein Motiv, dessen Schwerpunkt unter der Textkante liegt,
// ist im fertigen Post halb verdeckt - genau der PS5-Fall, bei dem das
// Logo hinter der Glaskarte verschwand.
//
// Gemessen wird an KANTEN, nicht an Helligkeit: Ein heller Himmel hat viel
// Licht und kein Motiv, ein dunkles Gesicht umgekehrt. Die Zeilenenergie
// (Unterschied zum linken Nachbarpixel) trifft beides richtig.
//
// Die Zahl geht doppelt in die Entscheidung ein: als harte Schranke im Code
// und als Hinweis an das Modell. Eine Regel, die nur im Prompt steht, ist
// keine Regel.
const TEXTKANTE = 0.63; // ab hier liegt der Textblock ueber dem Bild
// Ab dieser Dichte direkt unter der Textkante schneidet die Karte mitten
// durch das Motiv. Gemessen an sechs echten Bildern (23.08.2026):
// Miyazaki 0.44, AMD 0.83, GTA 1.14, God of War 1.15, 2XKO 1.38 - und das
// PS5-Logo, das Tim aufgefallen ist, mit 2.29. Die Grenze 1.6 trennt genau
// den einen echten Fehlgriff von den funktionierenden Bildern.
const MAX_KANTENDICHTE = 1.6;

// BILDGUETE HAT KEIN CODE-GEGENSTUECK - und das ist eine bewusste Ausnahme
// von unserer Regel "was im Prompt steht, muss im Code geprueft werden".
//
// Am 24.08.2026 fiel Tim ein Post auf, der "aussieht als haette ihn ein
// Fuenfjaehriger gepostet" - eine Grossaufnahme aus Metal Gear Solid 4.
// Ich habe drei Messverfahren an seinen guten und schlechten Beispielen
// durchprobiert:
//   - Schaerfe (Laplace-Varianz): Konami 233, Witcher 88 - das schlechte
//     Bild misst SCHAERFER als das gute.
//   - Detailtiefe (halbieren und zurueckrechnen): Konami 2.50,
//     Witcher 1.49, Dawnwalker 1.02 - dieselbe Umkehrung.
//   - Spitzenschaerfe der schaerfsten Kacheln: Konami 1640, Witcher 1168.
// Alle drei ordnen die Bilder GEGENTEILIG zu Tims Urteil. Der Grund: Ein
// modernes Motiv mit Tiefenunschaerfe ist rechnerisch weich, sieht aber
// teuer aus; ein altes Spiel ist rechnerisch scharf und sieht billig aus.
//
// Auch das Erscheinungsjahr taugt nicht: Steam meldet fuer Metal Gear
// Solid 4 den 27.08.2026, weil dort die Neuauflage gelistet ist.
//
// "Sieht das teuer aus" ist damit genau die Sorte Urteil, fuer die dieses
// Tor ueberhaupt ein sehendes Modell befragt statt einer Formel. Die
// Schranke im Code ist stattdessen die Annahmequote weiter unten: Wird das
// Kriterium zu streng ausgelegt, faellt sie - und die Warnung schlaegt an,
// bevor Posts ausfallen.

// BILDGEDAECHTNIS (Tim, 24.08.2026 - "das darf nicht passieren").
//
// Am 24.08. gingen zwei Modern-Warfare-Posts direkt hintereinander mit
// DEMSELBEN Motiv raus. Das Tor hatte in beiden Laeufen sauber gearbeitet
// und jeweils "offizieller Screenshot 4" gewaehlt - es kannte die Nachbar-
// posts einfach nicht. Ich hatte das Problem am 23.08. bereits beschrieben
// und ein Ausschlussgedaechtnis vorgeschlagen, es dann aber nie gebaut.
//
// Der Fingerabdruck ist bewusst inhaltsbasiert, nicht dateibasiert: Der
// Ausschnittsucher legt dasselbe Quellbild je nach Schlagzeile leicht
// anders, und die Dateien liegen unter wechselnden Temp-Namen. Verglichen
// wird darum ein stark verkleinertes Graustufenbild - zwei Ausschnitte
// desselben Motivs bleiben damit erkennbar verwandt, zwei verschiedene
// Motive nicht.
const FINGER_KANTE = 12; // 12x12 Graustufen = 144 Werte je Bild

export async function bildFingerabdruck(pfad) {
  const { data } = await sharp(pfad)
    .greyscale()
    .resize(FINGER_KANTE, FINGER_KANTE, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Array.from(data);
}

/** 0 = identisch, 1 = voellig verschieden. */
export function fingerAbstand(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 1;
  let summe = 0;
  for (let i = 0; i < a.length; i++) summe += Math.abs(a[i] - b[i]);
  return summe / a.length / 255;
}

// Unter diesem Abstand gelten zwei Bilder als dasselbe Motiv. An echten
// Faellen geeicht (24.08.2026): die beiden Modern-Warfare-Posts lagen bei
// 0.02, verschiedene Motive desselben Spiels bei 0.15 und darueber.
export const GLEICHES_MOTIV = 0.08;

async function motivSchwerpunkt(pfad) {
  const { data, info } = await sharp(pfad)
    .greyscale()
    .resize(160, 200, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const energie = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let summe = 0;
    for (let x = 1; x < width; x++) {
      summe += Math.abs(data[y * width + x] - data[y * width + x - 1]);
    }
    energie[y] = summe / width;
  }
  const gesamt = energie.reduce((a, b) => a + b, 0);
  if (gesamt === 0) return { schwerpunkt: 0.5, anteilUnten: 0 };
  let lauf = 0;
  let schwerpunkt = 0.5;
  for (let y = 0; y < height; y++) {
    lauf += energie[y];
    if (lauf >= gesamt / 2) { schwerpunkt = y / height; break; }
  }
  const grenze = Math.round(height * TEXTKANTE);
  const unten = energie.slice(grenze).reduce((a, b) => a + b, 0);
  // Schneidet die Karte mitten durch das Motiv? Dann ist direkt unter der
  // Textkante ueberdurchschnittlich viel los. Der Schwerpunkt allein
  // erkennt das nicht: Beim PS5-Logo lag er bei 58 Prozent und damit
  // scheinbar im gruenen Bereich, waehrend die untere Haelfte des Logos
  // hinter der Karte verschwand.
  const mittel = gesamt / height;
  const band = energie.slice(grenze, Math.round(height * 0.78));
  const kantendichte = band.length
    ? band.reduce((a, b) => a + b, 0) / band.length / (mittel || 1)
    : 0;
  return { schwerpunkt, anteilUnten: unten / gesamt, kantendichte };
}

export async function waehleBild({ kandidaten, schlagzeile, spielName, jahr = null, letzteBilder = [] }) {
  if (!kandidaten?.length) return { gewaehlt: null, grund: "keine Kandidaten", geprueft: 0 };

  // --- Stufe 1: messbare Ausschlusskriterien, ohne Modellaufruf ---
  let tauglich = [];
  for (const [i, k] of kandidaten.entries()) {
    let quelle = { width: 0, height: 0 };
    try {
      const m = await sharp(k.pfad).metadata();
      quelle = { width: m.width ?? 0, height: m.height ?? 0 };
    } catch {
      // Masse sind ein Zusatz fuers Urteil, kein Ausschlussgrund.
    }

    // FINGERABDRUCK DER QUELLE, NICHT DES AUSSCHNITTS (Fund 24.08.2026).
    //
    // Erste Fassung nahm den Abdruck vom fertigen Ausschnitt. Im Test kam
    // dabei heraus: Gedaechtnis sperrt "Quelle 1, mittig" - das Tor nimmt
    // "Quelle 1, links". Fuer die Rechnung sind das zwei Bilder, fuer
    // jeden Betrachter ist es dasselbe. Genau die Wiederholung, die Tim
    // beanstandet hat, waere so durch die eigene Sperre gerutscht.
    //
    // Der Abdruck haengt jetzt am Quellbild und gilt fuer alle seine
    // Ausschnitte gemeinsam.
    let motivFinger = null;
    try {
      motivFinger = await bildFingerabdruck(k.pfad);
    } catch (err) {
      console.log(`  Bild-Tor: Fingerabdruck von Kandidat ${i} nicht lesbar (${err.message})`);
    }

    // Mitte zuerst; die seitlichen Varianten kommen nur dazu, wenn das
    // Bild waagrecht ueberhaupt Spielraum hat (siehe X_VARIANTEN oben).
    let varianten = [X_VARIANTEN[0]];
    for (const [n, x] of X_VARIANTEN.entries()) {
      let schnitt;
      try {
        schnitt = await fertigerAusschnitt(
          k.pfad,
          join(tmpdir(), `rop-tor-${Date.now()}-${i}-${x}.jpg`),
          x,
        );
      } catch (err) {
        if (n === 0) console.log(`  Bild-Tor: Kandidat ${i} nicht lesbar (${err.message})`);
        continue;
      }
      if (!schnitt) {
        if (n === 0) console.log(`  Bild-Tor: Kandidat ${i} ohne Masse - verworfen`);
        continue;
      }
      if (n === 0) {
        // Ist waagrecht nichts zu verschieben, waeren die seitlichen
        // Varianten pixelgleich mit der Mitte - dann bleibt es bei einer.
        varianten = schnitt.spielraumX > 8 ? X_VARIANTEN : [X_VARIANTEN[0]];
      }
      if (!varianten.includes(x)) continue;
      if (schnitt.vergroesserung > MAX_VERGROESSERUNG) {
        if (n === 0) {
          console.log(
            `  Bild-Tor: Kandidat ${i} verworfen - muesste ${schnitt.vergroesserung.toFixed(2)}x hochgerechnet werden (Grenze ${MAX_VERGROESSERUNG})`,
          );
        }
        continue;
      }
      let lage = { schwerpunkt: 0.5, anteilUnten: 0, kantendichte: 0 };
      try {
        lage = await motivSchwerpunkt(schnitt.vorschau);
      } catch (err) {
        console.log(`  Bild-Tor: Motivlage von Kandidat ${i} nicht messbar (${err.message})`);
      }
      const lageWort = x === 50 ? "mittig" : x < 50 ? "links" : "rechts";
      tauglich.push({
        ...k,
        ...schnitt,
        ...lage,
        motivFinger,
        quelle,
        schnittLage: lageWort,
        herkunft: varianten.length > 1 ? `${k.herkunft ?? "Bild"}, ${lageWort} geschnitten` : k.herkunft,
        nummer: tauglich.length + 1,
      });
    }
  }

  if (tauglich.length === 0) {
    return { gewaehlt: null, grund: "alle Kandidaten zu klein oder unlesbar", geprueft: kandidaten.length };
  }

  // Motive, deren Schwerpunkt unter der Textkante liegt, fliegen raus -
  // ABER nur, solange etwas anderes uebrig bleibt. Ohne dieses Ventil
  // wuerde die Regel an einem Tag mit lauter breiten Vorlagen jeden Post
  // verhindern; ein halb verdecktes Motiv ist schlechter als ein gutes,
  // aber besser als gar kein Post.
  const verdeckt = (t) =>
    t.schwerpunkt > TEXTKANTE || t.kantendichte > MAX_KANTENDICHTE;
  // ZUERST das Bildgedaechtnis: Motive, die einer der letzten Posts schon
  // getragen hat, fliegen raus - aber nur, solange etwas uebrig bleibt.
  // Ohne dieses Ventil wuerde an einem Tag mit duennem Bildvorrat gar kein
  // Post mehr entstehen; eine Wiederholung ist schlecht, kein Post ist
  // schlechter.
  if (letzteBilder.length) {
    // Zwei Wege, dasselbe Motiv zu erkennen - der zweite faengt, was der
    // erste durchlaesst:
    //   1. Der Bildabdruck (aehnliches Motiv, auch aus anderer Quelle).
    //   2. Die exakte Kennung Spiel + Pool-Position. Die ist eindeutig und
    //      kennt keine Schwellenwerte: Derselbe Steam-Screenshot desselben
    //      Spiels ist derselbe Screenshot, Punkt.
    const schonDa = (t) => {
      if (t.spielKey && t.poolIndex != null) {
        if (letzteBilder.some((f) => f?.spielKey === t.spielKey && f?.poolIndex === t.poolIndex)) {
          return true;
        }
      }
      if (!t.motivFinger) return false;
      return letzteBilder.some(
        (f) => f?.motivFinger && fingerAbstand(t.motivFinger, f.motivFinger) < GLEICHES_MOTIV,
      );
    };
    const neuartig = tauglich.filter((t) => !schonDa(t));
    if (neuartig.length > 0 && neuartig.length < tauglich.length) {
      for (const t of tauglich.filter((x) => !neuartig.includes(x))) {
        console.log(
          `  Bild-Tor: Bild ${t.nummer} verworfen - Motiv war schon in einem der letzten Posts`,
        );
      }
      tauglich = neuartig;
      tauglich.forEach((t, n) => { t.nummer = n + 1; });
    } else if (neuartig.length === 0) {
      // KEIN VENTIL MEHR (Tim, 24.08.2026: "extrem kuratiert, ohne Wenn
      // und Aber"). Vorher liess diese Stelle alle Kandidaten weiterlaufen,
      // wenn jeder einzelne schon in einem der letzten Posts stand - eine
      // Wiederholung konnte also trotz Gedaechtnis rausgehen. Das war noch
      // die Denkweise aus der Zeit, als ein fehlender Post das Schlimmste
      // war. Seit die Typo-Karte weg ist, kostet ein Verzicht nichts: Die
      // Ersatz-Runde zieht die naechste Story nach.
      return {
        gewaehlt: null,
        grund: "jedes Motiv stand schon in einem der letzten Posts",
        geprueft: tauglich.length,
      };
    }
  }

  const frei = tauglich.filter((t) => !verdeckt(t));
  let auswahl = tauglich;
  if (frei.length > 0 && frei.length < tauglich.length) {
    for (const t of tauglich.filter(verdeckt)) {
      const warum =
        t.schwerpunkt > TEXTKANTE
          ? `Motiv sitzt bei ${Math.round(t.schwerpunkt * 100)}% der Hoehe`
          : `Motiv wird von der Textkante durchschnitten (Dichte ${t.kantendichte.toFixed(2)})`;
      console.log(`  Bild-Tor: Bild ${t.nummer} verworfen - ${warum}`);
    }
    auswahl = frei;
    auswahl.forEach((t, i) => { t.nummer = i + 1; });
  } else if (frei.length === 0) {
    console.log(
      "  Bild-Tor: jedes Motiv reicht in den Textbereich - es entscheidet die Beurteilung",
    );
  }

  // SCHAERFSTE ZUERST (Tim, 24.08.2026: "die am hochaufgeloestesten").
  //
  // Die Vergroesserung sagt, wie stark der fertige Ausschnitt auf
  // 1080x1350 aufgeblasen werden muss - kleiner ist besser. Die
  // Reihenfolge ist kein Urteil, sie legt nur die Nummern fest; die Wahl
  // trifft weiterhin das Modell. Aber bei zwei gleich guten Motiven
  // gewinnt so das schaerfere, und im Protokoll steht die Rangfolge.
  auswahl.sort((a, b) => a.vergroesserung - b.vergroesserung);
  if (auswahl.length > MAX_ANSICHTEN) {
    // KEINE STILLE KUERZUNG: Wird abgeschnitten, steht es im Protokoll.
    // Ein Deckel, den niemand sieht, liest sich spaeter wie "wir haben
    // alles geprueft" - und genau das waere dann falsch.
    console.log(
      `  Bild-Tor: ${auswahl.length} Ausschnitte vorhanden, dem Urteil werden die ${MAX_ANSICHTEN} schaerfsten gezeigt`,
    );
    auswahl = auswahl.slice(0, MAX_ANSICHTEN);
  }
  auswahl.forEach((t, i) => { t.nummer = i + 1; });

  // --- Stufe 2: Claude schaut sich die fertigen Ausschnitte an ---
  const inhalt = [];
  for (const t of auswahl) {
    inhalt.push({ type: "text", text: `Bild ${t.nummer} (${t.herkunft ?? "unbekannte Quelle"}):` });
    inhalt.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: (await sharp(t.vorschau).toBuffer()).toString("base64"),
      },
    });
    inhalt.push({
      type: "text",
      text: `   (gemessen: Quelle ${t.quelle?.width ?? "?"}x${t.quelle?.height ?? "?"} px, muss ${t.vergroesserung.toFixed(2)}x hochgerechnet werden - 1.0 waere verlustfrei; Motivschwerpunkt bei ${Math.round(t.schwerpunkt * 100)}% der Bildhoehe, ${Math.round(t.anteilUnten * 100)}% der Bildinformation im spaeter verdeckten Bereich, Dichte an der Textkante ${t.kantendichte.toFixed(2)})`,
    });
  }
  inhalt.push({
    type: "text",
    text: `Das sind ${auswahl.length} Ausschnitt-Varianten fuer EINEN Instagram-Post. Sie sind bereits fertig zugeschnitten - genau so wuerden sie erscheinen.

SCHLAGZEILE DES POSTS: "${schlagzeile}"${spielName ? `\nSPIEL: ${spielName}` : ""}${jahr ? `\nDAS SPIEL ERSCHIEN URSPRUENGLICH: ${jahr}` : ""}

So sieht der fertige Post aus: Ueber dem unteren Drittel (ab etwa 63 Prozent der Hoehe) liegt eine Glaskarte mit Kopfzeile und Schlagzeile - was dort im Bild steht, ist praktisch weg. Oben rechts sitzt unser Zeichen. Das Motiv muss also in den oberen zwei Dritteln tragen.

Zu jedem Bild steht in Klammern, wo sein Motivschwerpunkt liegt. Ueber 63 Prozent heisst: Das Wichtige verschwindet hinter der Karte.

Beurteile jedes Bild nach fuenf Kriterien:
1. SUJET: Passt das Motiv zur Schlagzeile? Ein Bild aus dem falschen Spiel, der falschen Ära oder dem falschen Schauplatz ist ein Ausschlussgrund - auch wenn es schoen ist.
2. AUSSCHNITT: Ist die Hauptfigur bzw. das Hauptmotiv als Ganzes sichtbar und gut platziert? Angeschnittene Figuren am Bildrand, Figuren die im unteren Textbereich verschwinden, oder ein leerer Bildausschnitt (nur Himmel, nur Boden, nur Wand) sind Ausschlussgruende. Ein Spiel-Schriftzug darf zu sehen sein, aber NICHT angeschnitten.
   WICHTIG: Von einem breiten Quellbild koennen MEHRERE Ausschnitte antreten - derselbe Screenshot einmal mittig, einmal links, einmal rechts geschnitten (steht jeweils dabei). Ein breites Bild verliert im Hochformat mehr als die Haelfte seiner Breite; welcher Ausschnitt genommen wird, entscheidet darum ueber Kopf oder kein Kopf, ganze Figur oder halbe. Vergleiche diese Varianten ausdruecklich gegeneinander und nimm die, in der das Motiv am besten steht. Mittig ist die Standardwahl - weiche nur ab, wenn es sichtbar besser ist.
3. WIRKUNG: Stoppt das Bild im Feed den Daumen? Gesichter und klare Motive ja, matschige Wimmelbilder nein.
4. BILDGUETE - der strengste Punkt (Tim, 24.08.2026): Sieht das Bild aus, als koennte es heute von einem Premium-Magazin stammen? Wir stehen im Feed direkt neben GameStar und GamePro, die offizielle Presse-Artworks verwenden. Ausschlussgruende sind: sichtbar veraltete Grafik (kantige Modelle, flache Texturen, Optik aelterer Konsolengenerationen), weichgezeichnete oder hochskalierte Bilder ohne feine Details, Bewegungsunschaerfe aus Zwischensequenzen, sichtbare Kompressionsartefakte.
   ACHTUNG, HAEUFIGER FEHLGRIFF: Ein Motiv kann gleichzeitig IKONISCH und OPTISCH VERALTET sein. Genau daran ist das Tor am 24.08. gescheitert - es waehlte eine Grossaufnahme aus einem Spiel von 2008 mit der Begruendung, sie sei ikonisch und stoppe den Daumen. Tim dazu: "es sieht so aus als haette es ein Fuenfjaehriger gepostet." Bekanntheit ersetzt keine Bildguete. Je groesser ein Gesicht im Bild steht, desto gnadenloser faellt jede Schwaeche auf.
   Handelt die Meldung von einem alten Spiel und ist ALLES Material entsprechend alt, ist das kein Grund zur Milde: Dann taugt keines - lieber keinen Post als einen, der billig aussieht.
   Das Erscheinungsjahr steht oben, falls bekannt. Vor 2012 heisst: Rechne mit Originalgrafik im Material und sieh besonders genau hin. Eine Meldung ueber eine Neuauflage rechtfertigt NUR Bilder der Neuauflage, nicht Sprites des Originals.

5. AUFLOESUNG: Zu jedem Bild steht, wie stark es hochgerechnet werden muss. Unter 1.2x ist sehr gut, ueber 1.5x sichtbar weich. Das ist KEIN eigenstaendiger Ausschlussgrund - ein starkes Motiv bei 1.5x schlaegt ein schwaches bei 1.1x. Aber bei zwei gleichwertigen Bildern gewinnt IMMER das mit der kleineren Zahl.

Waehle das beste Bild. Wenn KEINES die Kriterien erfuellt, waehle keines - wir nehmen dann eine andere Meldung, das ist ausdruecklich erlaubt und besser als ein schwacher Post.

ZUM SCHLUSS DREI EINZELFRAGEN ZU DEINEM GEWINNER. Beantworte sie getrennt mit true/false, nicht im Fliesstext - sie werden ausgewertet, und ein "false" verwirft das Bild:
- "grafikAktuell": Koennte dieses Bild aus einem heutigen Spiel stammen? false bei Sprite- oder Pixelgrafik, kantigen Modellen, flachen Texturen, sichtbarer Optik aelterer Konsolengenerationen.
- "schriftzugUnbeschnitten": Ist JEDER sichtbare Schriftzug und jedes Logo vollstaendig im Bild? false, sobald auch nur ein Buchstabe am Rand abgeschnitten ist. Ein abgeschnittener Schriftzug ist NIE durch andere Vorzuege aufzuwiegen.
- "motivFrei": Bleibt das Hauptmotiv oberhalb der Textkante sichtbar, ohne von der Glaskarte zerschnitten zu werden?

Antworte NUR mit JSON, erstes Zeichen "{":
{"bestes": 1, "begruendung": "ein Satz", "pruefung": {"grafikAktuell": true, "schriftzugUnbeschnitten": true, "motivFrei": true}, "verworfen": [{"bild": 2, "grund": "kurz"}]}
Taugt keines: {"bestes": null, "begruendung": "ein Satz warum alle durchfallen", "verworfen": [...]}`,
  });

  let urteil;
  try {
    const raw = await askClaude({
      system: SYSTEM,
      content: inhalt,
      maxTokens: 4000,
      model: MODELL_URTEIL,
    });
    urteil = parseJsonResponse(raw);
  } catch (err) {
    // KEIN STILLES DURCHWINKEN (bewusste Entscheidung): Faellt die Beurteilung
    // aus, koennte man "dann nimm halt das erste Bild" schreiben. Genau so
    // entsteht ein Waechter, der bei Stoerung wirkungslos wird, ohne dass es
    // jemand merkt. Stattdessen faellt der Kandidat durch und der Lauf holt
    // die naechste Story - der Vorrat ist da (rund 18 Artikel taeglich fuer
    // 5 Plaetze).
    const art = err instanceof ClaudeAblehnung ? "abgelehnt" : `Fehler: ${err.message}`;
    console.log(`  Bild-Tor: Beurteilung nicht moeglich (${art}) - Story wird uebersprungen`);
    return { gewaehlt: null, grund: `Beurteilung fehlgeschlagen (${art})`, geprueft: auswahl.length };
  }

  for (const v of urteil.verworfen ?? []) {
    console.log(`  Bild-Tor: Bild ${v.bild} verworfen - ${v.grund}`);
  }

  if (!urteil.bestes) {
    return {
      gewaehlt: null,
      grund: urteil.begruendung ?? "kein Kandidat ueberzeugt",
      geprueft: tauglich.length,
    };
  }

  // AUS "auswahl", NICHT AUS "tauglich" (Fehler gefunden 24.08.2026).
  //
  // Bis hierhin wurden die Nummern zweimal neu vergeben - einmal nach dem
  // Bildgedaechtnis, einmal nach dem Textkanten-Filter. Beim zweiten Mal
  // wurde nur "auswahl" ersetzt, "tauglich" behielt die verworfenen
  // Kandidaten MIT IHREN ALTEN NUMMERN. Beispiel: A(1) B(2) C(3), B faellt
  // wegen der Textkante raus, uebrig bleiben A(1) C(2) - in "tauglich"
  // stehen jetzt aber A(1) B(2) C(2). Sagte das Modell "Bild 2", lieferte
  // die Suche das VERWORFENE B zurueck statt C.
  //
  // Genau die Sorte Fehler, die niemandem auffaellt: Das Protokoll meldet
  // brav "Bild 2 gewaehlt", das Tor hat sauber geurteilt - und im Post
  // steht trotzdem das Motiv, das durchgefallen ist.
  const gewaehlt = auswahl.find((t) => t.nummer === urteil.bestes);
  if (!gewaehlt) {
    // Modell hat eine Nummer genannt, die es nicht gibt - als Durchfall
    // werten statt zu raten.
    return { gewaehlt: null, grund: `ungueltige Bildnummer ${urteil.bestes}`, geprueft: auswahl.length };
  }
  // DIE EINZELFRAGEN WERDEN IM CODE AUSGEWERTET (24.08.2026).
  //
  // WARUM: Der Probelauf vom 24.08. hat zwei Bilder durchgelassen, die das
  // Tor in seiner eigenen Begruendung selbst beanstandet hat - einmal
  // Terranigma-Sprites von 1995, einmal ein angeschnittener
  // Final-Fantasy-Schriftzug ("der angeschnittene Logo-Rest ... stoert
  // kaum"). Im Fliesstext laesst sich jeder Einwand wegwiegen; auf eine
  // getrennte Ja/Nein-Frage nicht.
  //
  // Ich habe vorher VIER Mal versucht, "sieht veraltet aus" zu MESSEN -
  // Schaerfe, Detailtiefe, Spitzenschaerfe und zuletzt Farbvielfalt plus
  // Blockigkeit. Alle vier trennen nichts: Das moderne Final-Fantasy-
  // Artwork misst blockiger (0.839) als die Terranigma-Sprites (0.792),
  // und Battlefield 6 hat weniger Farben als Terranigma. Es gibt keine
  // Formel dafuer.
  //
  // Also wird nicht das Bild gemessen, sondern die ANTWORT geprueft: Das
  // Modell muss jede Regel einzeln bejahen, und der Code haelt sich daran.
  // Fehlt eine Antwort, gilt sie als nicht bestanden - ein Tor, das bei
  // unklarer Lage durchwinkt, ist kein Tor.
  const FRAGEN = {
    grafikAktuell: "Grafik sieht veraltet aus",
    schriftzugUnbeschnitten: "Schriftzug oder Logo ist angeschnitten",
    motivFrei: "Motiv wird von der Glaskarte zerschnitten",
  };
  const durchgefallen = Object.entries(FRAGEN)
    .filter(([schluessel]) => urteil.pruefung?.[schluessel] !== true)
    .map(([, text]) => text);
  if (durchgefallen.length) {
    console.log(
      `  Bild-Tor: Bild ${gewaehlt.nummer} trotz Wahl verworfen - ${durchgefallen.join("; ")}`,
    );
    return {
      gewaehlt: null,
      grund: durchgefallen.join("; "),
      geprueft: auswahl.length,
    };
  }

  console.log(
    `  Bild-Tor: Bild ${gewaehlt.nummer} gewaehlt (${gewaehlt.herkunft ?? "?"}, ` +
      `${gewaehlt.quelle?.width}x${gewaehlt.quelle?.height}, ${gewaehlt.vergroesserung.toFixed(2)}x, ` +
      `Schnitt ${gewaehlt.positionX}%) - ${urteil.begruendung ?? ""}`,
  );
  return { gewaehlt, grund: urteil.begruendung ?? "", geprueft: tauglich.length };
}

// ANNAHMEQUOTE ÜBERWACHEN (Tim, 14.08.2026).
//
// Tims Sorge: "Es soll aber nicht sein, dass wir danach nur noch Typo-Karten
// posten weil jedes Bild abgelehnt wird."
//
// Faellt die Annahmequote sehr tief, ist nicht das Bildmaterial schlecht,
// sondern meine Messlatte falsch gesetzt. Rechenweg: rund 18 Artikel taeglich
// fuer 5 Plaetze - unter etwa 28 % Annahme laeuft der Tag leer. Die Warnung
// steht bei 30 %, damit sie kommt, BEVOR Posts ausfallen.
const WARNGRENZE = 0.3;
let angenommen = 0;
let abgelehnt = 0;

export function zaehleTorEntscheidung(ok) {
  if (ok) angenommen++;
  else abgelehnt++;
}

export function torBericht() {
  const gesamt = angenommen + abgelehnt;
  if (gesamt === 0) return;
  const quote = angenommen / gesamt;
  console.log(`Bild-Tor: ${angenommen}/${gesamt} Storys mit brauchbarem Bild (${Math.round(quote * 100)} %)`);
  // Erst ab vier Entscheidungen warnen - bei ein, zwei Storys pro Lauf ist
  // eine Quote von 50 % statistisch bedeutungslos und die Warnung nur Laerm.
  if (gesamt >= 4 && quote < WARNGRENZE) {
    console.log(
      `::warning::Bild-Tor: Annahmequote ${Math.round(quote * 100)} % liegt unter ${WARNGRENZE * 100} % - vermutlich ist die Messlatte zu streng, nicht das Bildmaterial schlecht. pipeline/lib/bildtor.mjs pruefen.`,
    );
  }
}
