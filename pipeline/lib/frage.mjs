import { askClaude, parseJsonResponse } from "./claude.mjs";

// COMMUNITY-FRAGE (Tim, 12.08.2026, nach dem Vergleich mit GameStar).
//
// WARUM: Unser Kanal kannte bis dahin genau EIN Format - Bild plus
// Schlagzeile, fuenfmal am Tag. Jeder Post zielte auf einen Klick zur
// Website. Instagram sieht diesen Klick aber gar nicht; was der Algorithmus
// sieht, sind Kommentare, und die sind das staerkste Reichweiten-Signal
// ueberhaupt. Wir hatten null Posts, die dafuer gebaut waren.
//
// Diese Datei liefert die Frage und prueft sie. Gerendert wird sie von
// instagram-frage.mjs, eingeplant von instagram.mjs.

// Wie oft und wann (Tim-Vorgabe "ein bis zwei pro Woche"): Mittwoch und
// Sonntag ab 19 Uhr. Sonntagabend ist der staerkste Gaming-Slot der Woche,
// Mittwoch bricht die Nachrichten-Monotonie in der Wochenmitte.
export const FRAGE_TAGE = [0, 3]; // 0 = Sonntag, 3 = Mittwoch
export const FRAGE_AB_STUNDE = 19;

export const MAX_ZEILEN = 3;
export const MAX_WOERTER = 10;

// Offene Frageworte. Eine Frage, die man mit Ja oder Nein beantworten kann,
// erzeugt Zustimmung - aber kaum Kommentare. Eine Frage, die zum NENNEN
// zwingt ("welches Spiel", "was zockt ihr"), erzeugt Antworten, die andere
// wiederum lesen und beantworten. Alternativ zaehlt eine Entweder-oder-Frage:
// die polarisiert und traegt sich damit selbst.
const OFFEN = /^(welche[rsn]?|was|wie|wo|wann|wer|wieso|warum|womit|wovon|wen|wem)\b/i;

// Wortliste wie im Schlagzeilen-Waechter: Woerter, die es in der
// ue/oe/ae-Schreibweise im Deutschen NICHT gibt.
const UMSCHRIEBEN =
  /\b(zurueck|fuer|ueber|ueber\w+|muessen|koennen|moeglich|groesse|groesser|schliessen|waehrend|naechste[rns]?|spaeter|hoeher|staerker|erklaert|gehoert|zerstoeren|endgueltig|urspruenglich|kuendigt|angekuendigt|enthuellt|verfuegbar|unterstuetzt|einfuehrung|jaehrlich|taeglich|zoegern|erwuenscht)\b/i;

function woerter(zeile) {
  return zeile
    .map((seg) => String(seg?.text ?? ""))
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function textAus(frageLines) {
  return frageLines.map((z) => z.map((s) => s.text).join(" ")).join(" ").replace(/\s+/g, " ").trim();
}

// Rueckgabe: { ok, fehler: [] }
export function pruefeFrage(frageLines) {
  const fehler = [];
  if (!Array.isArray(frageLines) || frageLines.length === 0) {
    return { ok: false, fehler: ["keine Zeilen"] };
  }
  if (!frageLines.every((z) => Array.isArray(z) && z.length > 0)) {
    return { ok: false, fehler: ["Zeilenstruktur ungueltig"] };
  }
  if (frageLines.length > MAX_ZEILEN) {
    fehler.push(`${frageLines.length} Zeilen (erlaubt: ${MAX_ZEILEN})`);
  }

  const proZeile = frageLines.map(woerter);
  const gesamt = proZeile.reduce((s, w) => s + w.length, 0);
  if (gesamt > MAX_WOERTER) fehler.push(`${gesamt} Woerter (erlaubt: ${MAX_WOERTER})`);
  if (proZeile.some((w) => w.length === 0)) fehler.push("leere Zeile");

  const text = textAus(frageLines);
  if (!text.endsWith("?")) fehler.push("endet nicht auf einem Fragezeichen");

  // Offene Frage ODER Entweder-oder - sonst bekommen wir Daumen statt Text.
  if (!OFFEN.test(text) && !/\boder\b/i.test(text)) {
    fehler.push("weder offene Frage noch Entweder-oder (Ja/Nein-Frage bringt keine Kommentare)");
  }

  if (text.includes("ß")) fehler.push('enthaelt "ß" (Schweizer Rechtschreibung)');

  const umschrieben = proZeile.flat().filter((w) => UMSCHRIEBEN.test(w));
  if (umschrieben.length) fehler.push(`Umlaut ausgeschrieben: ${umschrieben.join(", ")}`);

  const cyanZahl = frageLines.flat().filter((s) => s?.cyan).length;
  if (cyanZahl > 2) fehler.push(`${cyanZahl} Cyan-Segmente (erlaubt: 2)`);

  const laengstesWort = Math.max(...proZeile.flat().map((w) => w.length));
  if (laengstesWort > 20) fehler.push(`Wort mit ${laengstesWort} Zeichen zu lang fuer eine Zeile`);

  // Verbote aus dem Caption-Regelwerk gelten auch hier.
  if (/markiere|markiert|folgt uns|follow/i.test(text)) {
    fehler.push("Aufforderung zum Markieren/Folgen");
  }

  return { ok: fehler.length === 0, fehler };
}

// CAPTION-PRUEFUNG (12.08.2026): Der Schlagzeilen-Waechter und pruefeFrage
// schauen nur auf den Text AUF der Grafik. Die Caption lief bisher ungeprueft
// durch - und prompt stand in meinem eigenen Notvorrat "was bei euch gerade
// laeuft". Dieselben Regeln gelten dort: Schweizer Rechtschreibung, echte
// Umlaute, keine Follow- oder Markier-Aufrufe.
export function pruefeCaption(caption) {
  const fehler = [];
  const text = String(caption ?? "");
  if (text.trim().length === 0) return { ok: false, fehler: ["leer"] };
  if (text.includes("ß")) fehler.push('enthaelt "ß" (Schweizer Rechtschreibung)');
  const umschrieben = text.split(/\s+/).filter((w) => UMSCHRIEBEN.test(w));
  if (umschrieben.length) fehler.push(`Umlaut ausgeschrieben: ${umschrieben.join(", ")}`);
  if (/markiere|markiert \d|folgt uns|follow us/i.test(text)) {
    fehler.push("Aufforderung zum Markieren/Folgen");
  }
  if (/link in (der )?bio/i.test(text)) {
    fehler.push("verweist auf den Link in der Bio (die Frage fuehrt nirgendwohin)");
  }
  if (/republic-of-pixels/i.test(text)) fehler.push("Republic of Pixels mit Bindestrichen");
  return { ok: fehler.length === 0, fehler };
}

// Notvorrat. Faellt Claude aus oder liefert dreimal Unbrauchbares, geht der
// Slot NICHT verloren - wir nehmen eine zeitlose Frage. Sie sind bewusst so
// gebaut, dass die Antwort ein Spielname oder ein Satz ist, nie ein Ja.
export const NOTVORRAT = [
  {
    frageLines: [
      [{ text: "WELCHES SPIEL", cyan: false }],
      [{ text: "HAT DICH ZULETZT", cyan: false }],
      [{ text: "ÜBERRASCHT?", cyan: true }],
    ],
    caption:
      "Manchmal startet man ein Spiel ohne Erwartung - und legt es 40 Stunden nicht mehr weg. 👀\n\nWelches war es bei dir?",
    hashtags: ["Gaming", "GamingDeutschland", "Zocken", "GamingCommunity", "RepublicOfPixels"],
  },
  {
    frageLines: [
      [{ text: "WAS ZOCKT IHR", cyan: false }],
      [{ text: "GERADE?", cyan: true }],
    ],
    caption:
      "Sonntagabend, Controller in der Hand. 🎮\n\nVerratet uns, was bei euch gerade läuft - wir sind neugierig.",
    hashtags: ["Gaming", "GamingDeutschland", "Zocken", "GamingCommunity", "RepublicOfPixels"],
  },
  {
    frageLines: [
      [{ text: "WELCHES REMAKE", cyan: false }],
      [{ text: "WÜRDET IHR", cyan: false }],
      [{ text: "SOFORT KAUFEN?", cyan: true }],
    ],
    caption:
      "Jedes Jahr kommt ein Remake, an das niemand gedacht hat - und das eine, auf das alle warten, bleibt aus. 😤\n\nWelches ist deins?",
    hashtags: ["Gaming", "GamingDeutschland", "Remake", "GamingCommunity", "RepublicOfPixels"],
  },
  {
    frageLines: [
      [{ text: "WELCHER SOUNDTRACK", cyan: false }],
      [{ text: "LÄUFT BEI DIR", cyan: false }],
      [{ text: "AUCH OHNE SPIEL?", cyan: true }],
    ],
    caption:
      "Manche Melodien haben das Spiel längst überlebt. 🎧\n\nWelche ist es bei dir?",
    hashtags: ["Gaming", "GamingDeutschland", "Gamemusic", "GamingCommunity", "RepublicOfPixels"],
  },
  {
    frageLines: [
      [{ text: "WELCHES SPIEL", cyan: false }],
      [{ text: "HAST DU NIE", cyan: false }],
      [{ text: "ZU ENDE GESPIELT?", cyan: true }],
    ],
    caption:
      "Wir alle haben eines: angefangen, geliebt - und nie beendet. 😅\n\nBeichte in den Kommentaren.",
    hashtags: ["Gaming", "GamingDeutschland", "Zocken", "GamingCommunity", "RepublicOfPixels"],
  },
  {
    frageLines: [
      [{ text: "PS5 ODER", cyan: false }],
      [{ text: "XBOX SERIES X:", cyan: false }],
      [{ text: "WAS STEHT BEI DIR?", cyan: true }],
    ],
    caption:
      "Die älteste Frage im Wohnzimmer. 🎮\n\nSagt uns, was bei euch unter dem Fernseher steht - und warum.",
    hashtags: ["Gaming", "GamingDeutschland", "PS5", "Xbox", "RepublicOfPixels"],
  },
];

const SYSTEM = `Du bist die Social-Media-Redaktion von Republic of Pixels, einem deutschsprachigen Gaming-Magazin. Du schreibst eine Community-Frage fuer Instagram mit genau einem Ziel: moeglichst viele echte Kommentare. Sprache: Deutsch in SCHWEIZER Rechtschreibung - NIEMALS "ß", immer "ss". Umlaute werden als Umlaute geschrieben (ZURÜCK, nicht ZURUECK). "Republic of Pixels" nie mit Bindestrichen verbinden.`;

export async function holeFrage(kontextTitel = []) {
  const kontext = kontextTitel.length
    ? `Woran unsere Leser diese Woche dran waren (nur als Inspiration, die Frage MUSS auch ohne diese Artikel verstaendlich sein):\n${kontextTitel.map((t) => `- ${t}`).join("\n")}\n\n`
    : "";

  const prompt = `${kontext}Schreibe EINE Community-Frage fuer einen Instagram-Post.

Regeln fuer "frageLines" (der Text auf der Grafik):
- 2-3 Zeilen, gesamthaft maximal ${MAX_WOERTER} Woerter, GROSSBUCHSTABEN
- Jede Zeile ist ein Array von Segmenten {"text": "...", "cyan": true/false}
- Genau 1, hoechstens 2 Cyan-Segmente - cyan hebt den Kern der Frage hervor
- Der Text MUSS auf ein Fragezeichen enden
- ENTWEDER offene Frage (Welches/Was/Wie/Wer/Wo/Warum ...) ODER Entweder-oder-Frage.
  Eine Ja/Nein-Frage ist VERBOTEN: Sie bringt Likes, aber keine Kommentare.
- Die Antwort muss in drei Sekunden im Kopf sein - ein Spielname, eine Zahl,
  eine Erinnerung. Niemand schreibt einen Aufsatz.
- Keine Emojis auf der Grafik, keine Anfuehrungszeichen um die ganze Frage

Regeln fuer "caption":
1. Ein bis zwei Saetze, die die Frage aufladen - eine gemeinsame Erfahrung
   benennen, ueber die man reden WILL. Mit 1-2 passenden Emojis.
2. Danach eine Leerzeile und die direkte Aufforderung zu antworten, in der
   "ihr"/"du"-Form. Kein "markiere 3 Freunde", keine Follow-Aufrufe.
3. KEIN Verweis auf einen Artikel oder den Link in der Bio - dieser Post
   fuehrt nirgendwohin, er soll Gespraech ausloesen.

Regeln fuer "hashtags": EXAKT 5, CamelCase, ohne #-Zeichen im JSON:
1x Gaming, 1x GamingDeutschland oder Zocken, 2x thematisch passend, 1x RepublicOfPixels.

Antworte NUR mit JSON, erstes Zeichen "{":
{"frageLines":[[{"text":"...","cyan":false}]],"caption":"...","hashtags":["..."]}
KRITISCH - striktes JSON: Zeilenumbrueche in der Caption IMMER als \\n escapen.`;

  for (let versuch = 0; versuch < 3; versuch++) {
    try {
      const raw = await askClaude({ system: SYSTEM, prompt, maxTokens: 2000 });
      const d = parseJsonResponse(raw);
      const pruefung = pruefeFrage(d.frageLines);
      if (!pruefung.ok) {
        console.log(
          `  Frage verworfen: ${pruefung.fehler.join("; ")} - "${textAus(d.frageLines ?? [])}"`,
        );
        continue;
      }
      const capPruefung = pruefeCaption(d.caption);
      if (!capPruefung.ok) {
        console.log(`  Frage verworfen (Caption): ${capPruefung.fehler.join("; ")}`);
        continue;
      }
      return {
        frageLines: d.frageLines,
        caption: d.caption,
        hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
        quelle: "claude",
      };
    } catch (err) {
      console.log(`  Frage-Abruf fehlgeschlagen (${err.message}) - Wiederholung`);
    }
  }

  // Notvorrat statt Totalausfall.
  const wahl = NOTVORRAT[Math.floor(Math.random() * NOTVORRAT.length)];
  console.log("  Frage aus dem Notvorrat (Claude lieferte nichts Brauchbares).");
  return { ...wahl, quelle: "notvorrat" };
}
