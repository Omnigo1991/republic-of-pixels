import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { askClaude, parseJsonResponse, MODELL_URTEIL, ClaudeAblehnung } from "./claude.mjs";
import { entferneBalken } from "./letterbox.mjs";
import { besterAusschnitt } from "./instagram-card.mjs";

// DAS BILD-TOR (Tim, 14.08.2026).
//
// WARUM ES DAS GIBT: Am 13. und 14.08. hat Tim aus zwei Testrunden dieselbe
// Lehre gezogen — unsere Wächter prüfen ZUTATEN, nie das ERGEBNIS. Für Bilder
// heisst das konkret: Wir prüfen die Quellhöhe (>= 900 px) und schneiden dann
// nach einer Varianz-Heuristik zu. Ob am Ende die Figur im Bild ist, ob das
// Motiv überhaupt zur Schlagzeile passt und ob der Ausschnitt etwas taugt,
// hat noch nie jemand nachgesehen.
//
// Tims drei Kriterien im Wortlaut: "A) die Auflösung stimmen, B) das Sujet
// passen, C) die Szene attraktiv dargestellt werden können (Ausrichtung,
// Zoom, Auflösung, Lesbarkeit des Headers etc.)."
//
// Dieses Modul prüft alle drei — und zwar am fertigen 1080×1350-Ausschnitt,
// also an genau dem Bild, das die Leute sehen. Ein 1920×1080-Bild kann einen
// miserablen 4:5-Ausschnitt ergeben; Tomb Raider hatte im Test die beste
// Auflösung von allen und das schlechteste Ergebnis.
//
// WARUM CLAUDE HINSCHAUT STATT EINER FORMEL: Zweimal habe ich versucht,
// "ist die Figur im Bild" mit Statistik zu lösen (Varianz, Struktur,
// Unruhe). Beide Male hat es das Falsche gewählt — bei Zelda den leeren
// Himmel, bei Halloween das Haus statt Michael Myers. Eine Heuristik kennt
// kein Motiv. Also fragen wir jemanden, der sehen kann.

// A) AUFLÖSUNG — gemessen am ERGEBNIS, nicht an der Quelle.
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
// die bestehende 900-px-Regel IST bereits eine 1.5x-Grenze — nur eben an der
// Quelle gemessen statt am Ergebnis. Ein paar Beispiele:
//
//   1920 x 1080  ->  1.25x   (sehr gut)
//   1600 x 900   ->  1.50x   (unsere Standardgrösse, von Tim vielfach abgenommen)
//   1024 x 1024  ->  1.32x   (das Bären-Bild, Tim: "in Ordnung")
//    901 x 505   ->  2.67x   (GTA 6, Tim: "Auflösung schlecht")
//
// Mein erster Wert war 1.35 — der hätte 1600 x 900 verworfen, also praktisch
// jedes Artikelbild und die meisten Steam-Screenshots. Der Prüflauf hat es
// gefunden, bevor es einen Post gekostet hat.
//
// 1.6 entspricht rund 845 px Quellhöhe bei 16:9. Das ist Tims "Mindestgüte
// etwas lockerer als die bisherigen 900 px" — und zugleich sein "lockerer
// heisst ein paar Pixel unter der Grenze, nicht 505 statt 900". GTA 6 fällt
// mit 2.67x weiterhin klar durch.
//
// Der Gewinn gegenüber der alten Quellhöhen-Regel: Diese Messung gilt für
// JEDES Seitenverhältnis. Ein 3000 x 900-Panorama besteht die 900-px-Regel,
// liefert aber einen miserablen 4:5-Ausschnitt — hier fällt es durch.
const MAX_VERGROESSERUNG = 1.6;

// Vorschaugrösse für die Beurteilung. Halbe Kantenlänge des fertigen Posts:
// genug, um Figur, Ausrichtung und Schärfe zu beurteilen, und ein Viertel
// der Bildpunkte — also ein Viertel der Kosten.
const VORSCHAU_B = 540;
const VORSCHAU_H = 675;

const SYSTEM = `Du bist Bildredaktion eines deutschsprachigen Gaming-Magazins und beurteilst Instagram-Posts im Format 1080x1350. Du bist streng, aber nicht unmöglich: Wir brauchen taeglich vier bis fuenf Posts, koennen also nicht auf das perfekte Bild warten — aber ein schwacher Post ist schlimmer als ein fehlender. Du antwortest ausschliesslich mit JSON.`;

/**
 * Erzeugt den Ausschnitt, den der Renderer spaeter zeigen wuerde.
 *
 * WICHTIG: Hier wird bewusst dieselbe Logik benutzt wie im Renderer
 * (entferneBalken + besterAusschnitt + object-fit-cover-Rechnung). Wuerden
 * wir anders zuschneiden, beurteilte Claude ein Bild, das so nie erscheint —
 * und wir haetten wieder einen Waechter, der etwas anderes prueft als das,
 * was am Ende herauskommt. Genau dieser Fehler hat uns die erste Woche
 * gekostet.
 */
async function fertigerAusschnitt(pfad, zielPfad) {
  const balkenfrei = await entferneBalken(pfad);
  const quelle = balkenfrei.pfad;

  const { width = 0, height = 0 } = await sharp(quelle).metadata();
  if (!width || !height) return null;

  const { positionX, positionY } = await besterAusschnitt(quelle);

  // object-fit: cover — dieselbe Rechnung wie im Browser.
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
  };
}

/**
 * Beurteilt mehrere Bildkandidaten und liefert den besten — oder keinen.
 *
 * @param {object}   o
 * @param {Array}    o.kandidaten  [{ pfad, credit, herkunft }]
 * @param {string}   o.schlagzeile Die Schlagzeile des Posts (fuer "passt das Sujet?")
 * @param {string}  [o.spielName]  Spielname, falls bekannt
 * @returns {Promise<{gewaehlt: object|null, grund: string, geprueft: number}>}
 *          gewaehlt ist null, wenn KEIN Kandidat taugt. Dann zieht der Aufrufer
 *          die naechste Story — nicht eine Typo-Karte (Tim, 14.08.2026:
 *          "Wir sind keine Typo-Account").
 */
export async function waehleBild({ kandidaten, schlagzeile, spielName }) {
  if (!kandidaten?.length) return { gewaehlt: null, grund: "keine Kandidaten", geprueft: 0 };

  // --- Stufe 1: messbare Ausschlusskriterien, ohne Modellaufruf ---
  const tauglich = [];
  for (const [i, k] of kandidaten.entries()) {
    let schnitt;
    try {
      schnitt = await fertigerAusschnitt(k.pfad, join(tmpdir(), `rop-tor-${Date.now()}-${i}.jpg`));
    } catch (err) {
      console.log(`  Bild-Tor: Kandidat ${i} nicht lesbar (${err.message})`);
      continue;
    }
    if (!schnitt) {
      console.log(`  Bild-Tor: Kandidat ${i} ohne Masse — verworfen`);
      continue;
    }
    if (schnitt.vergroesserung > MAX_VERGROESSERUNG) {
      console.log(
        `  Bild-Tor: Kandidat ${i} verworfen — muesste ${schnitt.vergroesserung.toFixed(2)}x hochgerechnet werden (Grenze ${MAX_VERGROESSERUNG})`,
      );
      continue;
    }
    tauglich.push({ ...k, ...schnitt, nummer: tauglich.length + 1 });
  }

  if (tauglich.length === 0) {
    return { gewaehlt: null, grund: "alle Kandidaten zu klein oder unlesbar", geprueft: kandidaten.length };
  }

  // --- Stufe 2: Claude schaut sich die fertigen Ausschnitte an ---
  const inhalt = [];
  for (const t of tauglich) {
    inhalt.push({ type: "text", text: `Bild ${t.nummer} (${t.herkunft ?? "unbekannte Quelle"}):` });
    inhalt.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: (await sharp(t.vorschau).toBuffer()).toString("base64"),
      },
    });
  }
  inhalt.push({
    type: "text",
    text: `Das sind ${tauglich.length} Ausschnitt-Varianten fuer EINEN Instagram-Post. Sie sind bereits fertig zugeschnitten — genau so wuerden sie erscheinen.

SCHLAGZEILE DES POSTS: "${schlagzeile}"${spielName ? `\nSPIEL: ${spielName}` : ""}

Unten im Bild liegt spaeter unser Textblock ueber einem dunklen Verlauf (etwa das untere Drittel). Was dort liegt, verschwindet weitgehend.

Beurteile jedes Bild nach drei Kriterien:
1. SUJET: Passt das Motiv zur Schlagzeile? Ein Bild aus dem falschen Spiel, der falschen Ära oder dem falschen Schauplatz ist ein Ausschlussgrund — auch wenn es schoen ist.
2. AUSSCHNITT: Ist die Hauptfigur bzw. das Hauptmotiv als Ganzes sichtbar und gut platziert? Angeschnittene Figuren am Bildrand, Figuren die im unteren Textbereich verschwinden, oder ein leerer Bildausschnitt (nur Himmel, nur Boden, nur Wand) sind Ausschlussgruende. Ein Spiel-Schriftzug darf zu sehen sein, aber NICHT angeschnitten.
3. WIRKUNG: Stoppt das Bild im Feed den Daumen? Gesichter und klare Motive ja, matschige Wimmelbilder nein.

Waehle das beste Bild. Wenn KEINES die Kriterien erfuellt, waehle keines — wir nehmen dann eine andere Meldung, das ist ausdruecklich erlaubt und besser als ein schwacher Post.

Antworte NUR mit JSON, erstes Zeichen "{":
{"bestes": 1, "begruendung": "ein Satz", "verworfen": [{"bild": 2, "grund": "kurz"}]}
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
    // die naechste Story — der Vorrat ist da (rund 18 Artikel taeglich fuer
    // 5 Plaetze).
    const art = err instanceof ClaudeAblehnung ? "abgelehnt" : `Fehler: ${err.message}`;
    console.log(`  Bild-Tor: Beurteilung nicht moeglich (${art}) — Story wird uebersprungen`);
    return { gewaehlt: null, grund: `Beurteilung fehlgeschlagen (${art})`, geprueft: tauglich.length };
  }

  for (const v of urteil.verworfen ?? []) {
    console.log(`  Bild-Tor: Bild ${v.bild} verworfen — ${v.grund}`);
  }

  if (!urteil.bestes) {
    return {
      gewaehlt: null,
      grund: urteil.begruendung ?? "kein Kandidat ueberzeugt",
      geprueft: tauglich.length,
    };
  }

  const gewaehlt = tauglich.find((t) => t.nummer === urteil.bestes);
  if (!gewaehlt) {
    // Modell hat eine Nummer genannt, die es nicht gibt — als Durchfall
    // werten statt zu raten.
    return { gewaehlt: null, grund: `ungueltige Bildnummer ${urteil.bestes}`, geprueft: tauglich.length };
  }
  console.log(
    `  Bild-Tor: Bild ${gewaehlt.nummer} gewaehlt (${gewaehlt.herkunft ?? "?"}, ${gewaehlt.vergroesserung.toFixed(2)}x) — ${urteil.begruendung ?? ""}`,
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
// fuer 5 Plaetze — unter etwa 28 % Annahme laeuft der Tag leer. Die Warnung
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
  // Erst ab vier Entscheidungen warnen — bei ein, zwei Storys pro Lauf ist
  // eine Quote von 50 % statistisch bedeutungslos und die Warnung nur Laerm.
  if (gesamt >= 4 && quote < WARNGRENZE) {
    console.log(
      `::warning::Bild-Tor: Annahmequote ${Math.round(quote * 100)} % liegt unter ${WARNGRENZE * 100} % — vermutlich ist die Messlatte zu streng, nicht das Bildmaterial schlecht. pipeline/lib/bildtor.mjs pruefen.`,
    );
  }
}
