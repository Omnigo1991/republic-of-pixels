// MODELL-VERGLEICH - dieselben Quellen, zwei Modelle, nebeneinander.
//
// WARUM: Am 14.08.2026 haben wir die Modellwahl je Aufgabe getrennt.
// Themenwahl und Instagram-Texte laufen seither auf dem staerkeren Modell,
// der Artikeltext bewusst noch nicht: Er ist der groesste Kostenposten, und
// ob das staerkere Modell dort SPUERBAR besser schreibt, wollte Tim selbst
// beurteilen statt es mir zu glauben.
//
// Dieses Skript nimmt echte, aktuelle Meldungen, schreibt jede mit beiden
// Modellen und legt die Ergebnisse nebeneinander. Es veroeffentlicht NICHTS
// und schreibt weder State noch Artikel ins Projekt.
//
// Start: GitHub → Actions → "Modell-Vergleich" → "Run workflow".
// Das Ergebnis haengt danach als Download am Lauf.
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FEEDS } from "./feeds.mjs";
import { fetchAllFeeds } from "./lib/rss.mjs";
import { extractArticleText } from "./lib/extract.mjs";
import { generateArticle } from "./run.mjs";
import { MODELL_TEXT, MODELL_HANDWERK, verbrauchBericht } from "./lib/claude.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUS = join(ROOT, "modell-vergleich");
const ANZAHL = Number(process.env.VERGLEICH_ANZAHL ?? 3);

// WELCHE ZWEI MODELLE VERGLICHEN WERDEN (Tim, 30.08.2026: "Ja, mach den
// Vergleich" - zur Frage, ob sich die API-Kosten senken lassen).
//
// Bis heute stand hier fest MODELL_TEXT gegen MODELL_URTEIL. Am 14.08. war
// das sinnvoll, weil die beiden verschieden waren. Inzwischen sind BEIDE
// claude-opus-5 - der Vergleich haette also denselben Artikel zweimal mit
// demselben Modell geschrieben und waere still nutzlos gewesen. Deshalb
// jetzt frei waehlbar, mit der aktuellen Frage als Vorgabe: Was wir heute
// benutzen gegen das, womit wir rund 40 Prozent sparen wuerden.
const MODELL_A = process.env.VERGLEICH_MODELL_A || MODELL_TEXT;
const MODELL_B = process.env.VERGLEICH_MODELL_B || MODELL_HANDWERK;

// Fliesstext aus den Body-Bloecken, damit sich die Fassungen lesen lassen
// ohne JSON zu entziffern.
function alsText(artikel) {
  if (!artikel || artikel.fehler) return `(fehlgeschlagen: ${artikel?.fehler ?? "unbekannt"})`;
  const zeilen = [`# ${artikel.title}`, "", `*${artikel.subtitle}*`, ""];
  for (const b of artikel.body ?? []) {
    if (b.type === "paragraph") zeilen.push(b.text, "");
    else if (b.type === "heading") zeilen.push(`## ${b.text}`, "");
    else if (b.type === "list") zeilen.push(...(b.items ?? []).map((i) => `- ${i}`), "");
    else if (b.type === "quote") zeilen.push(`> ${b.text}`, `> - ${b.attribution ?? ""}`, "");
    else if (b.type === "stats")
      zeilen.push(...(b.items ?? []).map((s) => `**${s.value}** ${s.label}`), "");
  }
  zeilen.push("---", "", `**Warum es zaehlt:** ${artikel.whyItMatters ?? ""}`, "");
  zeilen.push(`**Kurzfassung:** ${(artikel.tldr ?? []).join(" · ")}`, "");
  return zeilen.join("\n");
}

async function main() {
  mkdirSync(AUS, { recursive: true });

  console.log("Feeds abrufen …");
  // fetchAllFeeds liefert ein Ergebnis PRO FEED, nicht eine flache Liste von
  // Meldungen - genau wie in run.mjs muss erst flachgeklopft werden.
  //
  // ZWEITER FEHLSCHLAG AM 14.08.2026: Ich hatte das Rueckgabeformat geraten
  // statt nachzusehen. Die "33 Kandidaten" im Protokoll waren 33 FEEDS, und
  // keiner davon hat ein Feld "title" oder "link" - also blieb die Auswahl
  // leer. Der Lauf davor scheiterte an einer geratenen Feldbedingung. Zweimal
  // dieselbe Ursache: geraten statt geprueft.
  const ergebnisseFeeds = await fetchAllFeeds(FEEDS);
  const cutoff = Date.now() - 48 * 3600000;
  const kandidaten = ergebnisseFeeds
    .flatMap((r) => r.items ?? [])
    .filter((it) => it.publishedAt && it.publishedAt.getTime() > cutoff)
    .sort((a, b) => b.publishedAt - a.publishedAt);
  console.log(`  ${kandidaten.length} Meldungen aus den letzten 48 Stunden`);

  // Bewusst OHNE Claude ausgewaehlt: Die Auswahl soll den Vergleich nicht
  // beeinflussen, und beide Modelle sollen dieselben Quellen bekommen.
  //
  // FILTER KORRIGIERT (14.08.2026): Die erste Fassung verlangte einen
  // Feed-Anriss von ueber 120 Zeichen. Beim ersten echten Lauf hatte keiner
  // der 33 Kandidaten einen so langen Anriss - das Ergebnis war leer, ohne
  // dass irgendwo stand warum. Die Anrisslaenge war ohnehin das falsche
  // Merkmal: Entscheidend ist, ob sich der VOLLTEXT holen laesst, und das
  // prueft die Schleife unten bereits.
  const auswahl = kandidaten.filter((k) => k.title && k.link);
  console.log(`  ${auswahl.length} davon mit Titel und Link`);

  // TROCKENLAUF: Sammeln und Volltext pruefen, ohne Claude zu fragen. Damit
  // laesst sich der ganze Vorlauf ohne API-Schluessel testen - genau das
  // haette die zwei Fehlschlaege oben verhindert.
  if (process.env.VERGLEICH_TROCKEN) {
    console.log("\nTrockenlauf - es wird kein Text geschrieben.\n");
    let brauchbar = 0;
    for (const item of auswahl.slice(0, ANZAHL * 4)) {
      let text = "";
      try {
        // extractArticleText liefert ein OBJEKT {ok, text, ogImage, ...},
        // keinen String - siehe run.mjs, Zeile 474.
        text = (await extractArticleText(item.link)).text ?? "";
      } catch {
        // Wie im echten Lauf: nicht abrufbar ist kein Absturz.
      }
      const ok = text.length >= 400;
      if (ok) brauchbar++;
      console.log(`  ${ok ? "OK  " : "duenn"} ${String(text.length).padStart(6)} Zeichen  ${item.title.slice(0, 60)}`);
      if (brauchbar >= ANZAHL) break;
    }
    console.log(`\n${brauchbar} von ${ANZAHL} benoetigten Quellen haetten brauchbaren Volltext.`);
    if (brauchbar < ANZAHL) process.exitCode = 1;
    return;
  }

  const ergebnisse = [];
  const markdown = [
    "# Modell-Vergleich",
    "",
    `Erstellt am ${new Date().toISOString()}`,
    `Verglichen: **${MODELL_A}** gegen **${MODELL_B}**`,
    "",
  ];

  // Solange weitersuchen, bis genug Quellen mit brauchbarem Volltext
  // beisammen sind - ein nicht abrufbarer Artikel soll den Vergleich nicht
  // um eine Quelle aermer machen.
  let versuche = 0;
  for (const item of auswahl) {
    if (ergebnisse.length >= ANZAHL || versuche >= ANZAHL * 4) break;
    versuche++;
    const i = ergebnisse.length;
    console.log(`\n[${i + 1}/${ANZAHL}] ${item.title.slice(0, 70)}`);
    let text;
    try {
      // extractArticleText liefert ein OBJEKT {ok, text, ogImage, ...},
      // keinen String (run.mjs, Zeile 474). Ich hatte das geraten - der
      // Rohtext waere als "[object Object]" in den Prompt gewandert.
      text = (await extractArticleText(item.link)).text ?? "";
    } catch (err) {
      console.log(`  Quelltext nicht lesbar (${err.message}) - uebersprungen`);
      continue;
    }
    if (!text || text.length < 400) {
      console.log("  Quelltext zu duenn - uebersprungen");
      continue;
    }

    const cluster = {
      indices: [0],
      category: "news",
      platforms: ["pc"],
      isLeakOrRumor: false,
      depth: "standard",
    };
    const eintrag = { quelle: item.title, link: item.link, varianten: {} };
    markdown.push(`## Quelle ${i + 1}: ${item.title}`, "", `<${item.link}>`, "");

    for (const modell of [MODELL_A, MODELL_B]) {
      process.stdout.write(`  ${modell} … `);
      try {
        // Leeres Slug-Set: Wir veroeffentlichen nicht, Doppel-Slugs sind egal.
        const a = await generateArticle(cluster, [item], [text], new Set(), modell);
        eintrag.varianten[modell] = a;
        const woerter = (a.body ?? [])
          .map((b) => b.text ?? (b.items ?? []).join(" "))
          .join(" ")
          .split(/\s+/)
          .filter(Boolean).length;
        console.log(`fertig (~${woerter} Woerter)`);
        markdown.push(`### ${modell}`, "", alsText(a), "");
      } catch (err) {
        console.log(`FEHLER: ${err.message}`);
        eintrag.varianten[modell] = { fehler: err.message };
        markdown.push(`### ${modell}`, "", `(fehlgeschlagen: ${err.message})`, "");
      }
    }
    ergebnisse.push(eintrag);
  }

  writeFileSync(join(AUS, "vergleich.json"), JSON.stringify(ergebnisse, null, 2) + "\n");
  writeFileSync(join(AUS, "vergleich.md"), markdown.join("\n"));
  console.log(`\n${ergebnisse.length} Quelle(n) mit je zwei Fassungen geschrieben.`);
  // NICHT STILL LEER AUSGEHEN: Beim ersten Lauf kam eine leere Datei heraus,
  // und der Grund stand nirgends. Ein leeres Ergebnis ist ab jetzt ein
  // sichtbarer Fehlschlag.
  if (ergebnisse.length === 0) {
    console.log(
      `::error::Modell-Vergleich leer: ${auswahl.length} Kandidaten geprueft, bei keinem war der Volltext abrufbar.`,
    );
    process.exitCode = 1;
  }
  verbrauchBericht();
}

main().catch((err) => {
  console.error("Modell-Vergleich abgebrochen:", err);
  process.exit(1);
});
