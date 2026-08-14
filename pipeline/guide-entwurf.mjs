// GUIDE-ENTWURF — der erste Schritt zu Artikeln, die nicht veralten.
//
// WAS EIN "GUIDE" HIER HEISST: Ein Ratgeber-Artikel wie "Einsteigertipps zu
// STALKER 2" oder "Die besten Klassen in WoW Patch 12.1". Anders als eine
// News wird so ein Artikel monatelang gelesen, weil jede Woche neue Leute
// das Spiel anfangen und danach googeln.
//
// WARUM NUR EIN ENTWURF (Tim-Freigabe 14.08.2026): Guides sind eine NEUE
// Inhaltssorte mit eigenen Fehlerquellen — veraltete Patch-Angaben, falsche
// Werte, erfundene Tipps. Die Lehre der ersten Woche gilt auch hier: Nichts
// Neues geht ungeprüft auf die Seite. Dieses Skript erzeugt darum einen
// ENTWURF als Download, den Tim liest und beurteilt. Veröffentlicht wird
// von Hand — erst wenn die Qualität mehrfach gestimmt hat, reden wir über
// mehr Automatik.
//
// FAKTENBASIS PFLICHT: Ohne Quelltexte schreibt das Modell aus dem
// Gedächtnis — bei Patch-Ständen und Zahlen ist das gefährlich. Darum
// verlangt das Skript mindestens eine Quell-Adresse und zieht daraus den
// Text als Faktenbasis. Was nicht in den Quellen steht, darf nicht in den
// Guide.
//
// Start: GitHub → Actions → "Guide-Entwurf" → Run workflow.
//   thema:   z. B. "Einsteigertipps zu STALKER 2 nach Update 2.0"
//   quellen: eine oder mehrere Adressen, mit Komma getrennt
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractArticleText } from "./lib/extract.mjs";
import { askClaude, parseJsonResponse, MODELL_TEXT, verbrauchBericht } from "./lib/claude.mjs";
import { umschriebeneUmlaute } from "./lib/umlaut.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUS = join(ROOT, "guide-entwurf");

const SYSTEM = `Du bist Ratgeber-Redaktion von Republic of Pixels, einem deutschsprachigen Gaming-Magazin (SCHWEIZER Rechtschreibung: NIEMALS "ß", immer "ss"; "Republic of Pixels" nie mit Bindestrichen). Du schreibst Guides, die lange gelesen werden: ruhig, präzise, ohne Clickbait und ohne Füllsätze. WICHTIGSTE REGEL: Du behauptest NUR, was die mitgelieferten Quelltexte belegen. Fehlt eine Information, lässt du sie weg — du erfindest keine Werte, keine Patch-Details, keine Tipps.`;

async function main() {
  const thema = (process.env.GUIDE_THEMA ?? "").trim();
  const quellenListe = (process.env.GUIDE_QUELLEN ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  if (!thema) {
    console.log("::error::Kein Thema angegeben (GUIDE_THEMA).");
    process.exit(1);
  }
  if (quellenListe.length === 0) {
    console.log(
      "::error::Keine Quellen angegeben (GUIDE_QUELLEN). Ohne Quelltexte schreibt das Modell aus dem Gedächtnis — das lassen wir nicht zu.",
    );
    process.exit(1);
  }

  console.log(`Thema: ${thema}`);
  const quellTexte = [];
  for (const url of quellenListe) {
    const ex = await extractArticleText(url, { maxChars: 12000 });
    if (!ex.text || ex.text.length < 300) {
      console.log(`  Quelle nicht lesbar: ${url} (${ex.error ?? "zu wenig Text"})`);
      continue;
    }
    console.log(`  Quelle geladen: ${url} (${ex.text.length} Zeichen)`);
    quellTexte.push(`QUELLE (${url}):\n${ex.text}`);
  }
  if (quellTexte.length === 0) {
    console.log("::error::Keine der Quellen war lesbar — kein Entwurf erstellt.");
    process.exit(1);
  }

  if (process.env.GUIDE_TROCKEN) {
    console.log(`\nTrockenlauf: ${quellTexte.length} Quelle(n) lesbar, es wird nichts geschrieben.`);
    return;
  }

  const prompt = `Schreibe einen Guide zum Thema: ${thema}

FAKTENBASIS (nur hieraus zitieren, nichts dazuerfinden):

${quellTexte.join("\n\n")}

Aufbau: kurze Einleitung (wofür ist dieser Guide, für wen), dann klar
gegliederte Abschnitte mit Zwischentiteln, konkrete Handlungsanweisungen
statt Allgemeinplätzen. 700 bis 1000 Wörter. Wo eine Angabe vom Patch-Stand
abhängt, nenne den Stand ("Stand: Update 2.0, August 2026") — der Artikel
soll auch in Monaten noch brauchbar sein oder klar zeigen, worauf er sich
bezieht.

Antworte NUR mit JSON, erstes Zeichen "{":
{
  "title": "max. 70 Zeichen, sachlich, enthält den Spielnamen",
  "subtitle": "ein Satz: was der Guide liefert",
  "stand": "worauf sich der Guide bezieht, z. B. 'Update 2.0, August 2026'",
  "body": [{"type":"paragraph","text":"..."},{"type":"heading","text":"..."},{"type":"list","items":["..."]}],
  "offeneFragen": ["was die Quellen NICHT hergeben und ein Mensch prüfen müsste"]
}`;

  const raw = await askClaude({
    system: SYSTEM,
    prompt,
    maxTokens: 16000,
    model: MODELL_TEXT,
  });
  const guide = parseJsonResponse(raw);

  // Umlaut-Wächter auch hier — gleiche Regel wie überall.
  const texte = [];
  (function sammle(x) {
    if (typeof x === "string") texte.push(x);
    else if (Array.isArray(x)) x.forEach(sammle);
    else if (x && typeof x === "object") Object.values(x).forEach(sammle);
  })(guide);
  const umlautFunde = umschriebeneUmlaute(texte.join(" "));
  if (umlautFunde.length) {
    console.log(`::warning::Ausgeschriebene Umlaute im Entwurf: ${[...new Set(umlautFunde)].slice(0, 10).join(", ")}`);
  }

  // Lesbare Fassung für Tims Beurteilung.
  const md = [
    `# ${guide.title}`,
    "",
    `*${guide.subtitle}*`,
    "",
    `**Stand:** ${guide.stand ?? "(nicht angegeben)"}`,
    `**Quellen:** ${quellenListe.join(" · ")}`,
    "",
    "---",
    "",
  ];
  for (const b of guide.body ?? []) {
    if (b.type === "paragraph") md.push(b.text, "");
    else if (b.type === "heading") md.push(`## ${b.text}`, "");
    else if (b.type === "list") md.push(...(b.items ?? []).map((i) => `- ${i}`), "");
  }
  if (guide.offeneFragen?.length) {
    md.push("---", "", "## Vor Veröffentlichung von Hand prüfen", "");
    md.push(...guide.offeneFragen.map((f) => `- ${f}`), "");
  }

  mkdirSync(AUS, { recursive: true });
  writeFileSync(join(AUS, "entwurf.md"), md.join("\n"));
  writeFileSync(join(AUS, "entwurf.json"), JSON.stringify(guide, null, 2) + "\n");
  const woerter = texte.join(" ").split(/\s+/).filter(Boolean).length;
  console.log(`\nEntwurf geschrieben (~${woerter} Wörter). Er wird NICHT veröffentlicht — Download am Lauf.`);
  verbrauchBericht();
}

main().catch((err) => {
  console.error("Guide-Entwurf abgebrochen:", err);
  process.exit(1);
});
