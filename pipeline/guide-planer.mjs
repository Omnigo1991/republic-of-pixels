// GUIDE-PLANER (Tim, 27.08.2026: "Bau Welle 1 so um und beginne").
//
// DER BEFUND, DER DAZU GEFÜHRT HAT: In 23 Tagen sind 375 News entstanden und
// 2 Guides. Nicht weil Guides schlechter wären - im Gegenteil, in der Google
// Search Console holt der eine Stalker-Guide mehr Impressionen als die
// meisten Nachrichten, und die WoW-Patchnotes mit 272 Impressionen schlagen
// einen Durchschnittsartikel um das Vierzigfache. Der Grund ist banal: Die
// News-Pipeline hat eine Uhr, die Guide-Werkstatt hatte keine. Sie liess sich
// nur von Hand starten, mit Thema und Quell-Adressen als Eingabe.
//
// DIESES SKRIPT IST DIE FEHLENDE UHR. Es beantwortet die beiden Fragen, die
// bisher ein Mensch beantworten musste: worüber, und woraus.
//
// WORÜBER: Themen, zu denen wir selbst schon oft berichtet haben. Wer vier
// Meldungen zu einem Spiel geschrieben hat, hat auch das Material für eine
// Übersicht. 21 Themen erfüllen das heute, GTA 6 mit 34 Artikeln an der
// Spitze.
//
// WORAUS: Aus den Originalquellen unserer eigenen Artikel. Jeder Artikel
// trägt seine Quell-Adressen mit sich; die Werkstatt lädt sie und das
// Faktentor hält den fertigen Guide dagegen. Es entsteht also KEIN Text aus
// zweiter Hand und keiner aus dem Gedächtnis des Modells.
//
// WAS DIESER WEG NICHT KANN, UND ZWAR GRUNDSÄTZLICH: Spiel-Tutorials.
// "Einsteigertipps zu STALKER 2" verlangt Wissen darüber, wie sich das Spiel
// spielt - das steht in keiner Nachrichtenmeldung. Würde das Modell es
// trotzdem schreiben, erfände es die Tipps, und das Faktentor müsste sie
// verwerfen. Automatisch entstehen deshalb ÜBERSICHTSSEITEN ("Alles
// Bestätigte zu X"), und das ist kein Notbehelf: Genau diese Seiten werden
// monatelang gesucht, wachsen mit jeder neuen Meldung und lassen sich unter
// derselben Adresse pflegen. Echte Spielhilfen bleiben Handarbeit über die
// Guide-Werkstatt.

import { readdirSync, readFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTICLES_DIR = join(ROOT, "src", "content", "articles");

/** So viele eigene Artikel braucht ein Thema, bevor eine Übersicht lohnt. */
const MIN_ARTIKEL = Number(process.env.GUIDE_MIN_ARTIKEL ?? 4);

/** So viele Quellen bekommt die Werkstatt höchstens - mehr sprengt ihr Textbudget. */
const MAX_QUELLEN = 5;

/**
 * Themen, die keine Spiel-Übersicht tragen. "PC" oder "Leak" sind Schlagworte,
 * keine Gegenstände - eine Seite "Alles Bestätigte zu PC" wäre sinnlos und
 * würde genau die dünnen Seiten erzeugen, die Google schon heute als
 * Duplikate aussortiert (36 unserer Seiten stehen aus diesem Grund nicht im
 * Index, Stand 27.08.2026).
 */
const KEINE_THEMEN = new Set([
  "pc", "playstation", "xbox", "nintendo", "steam", "leak", "leaks",
  "grafikkarten", "hardware", "electronic arts", "ubisoft", "rockstar games",
  "microsoft", "sony", "nintendo switch 2", "ps5", "ps6", "xbox series x",
  "gerücht", "geruecht", "test", "review", "esports", "gaming",
]);

function alleArtikel() {
  const liste = [];
  for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      liste.push(JSON.parse(readFileSync(join(ARTICLES_DIR, f), "utf8")));
    } catch {
      // unlesbare Datei ignorieren - der Index-Generator meldet sie ohnehin
    }
  }
  return liste;
}

const artikel = alleArtikel();

// DER DOPPEL-RIEGEL. Zwei Guides zum selben Spiel würden bei Google um
// denselben Suchbegriff konkurrieren und sich gegenseitig schwächen.
//
// ER MUSS ÜBER NAMENSVARIANTEN HINWEG GREIFEN (Fund beim ersten Testlauf,
// 27.08.2026): Mein erster Entwurf verglich nur das erste Schlagwort und
// hätte GTA 6 sofort einen zweiten Guide verpasst - der bestehende liegt
// unter "Grand Theft Auto VI", unsere Meldungen laufen unter "GTA 6".
// Lexikalisch haben die beiden nichts gemeinsam. Was sie verbindet, ist der
// TITEL des Guides ("GTA 6: Release, Preis und Editionen im Überblick"), und
// genau darum wird der Titel mitdurchsucht.
const normal = (s) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9äöü ]+/g, " ").replace(/\s+/g, " ").trim();

const guideTexte = artikel
  .filter((a) => a.category === "guides")
  .map((a) => normal([a.title, ...(a.tags ?? [])].join(" ")));

function schonVersorgt(themenName) {
  const n = normal(themenName);
  if (n.length < 4) return false;
  return guideTexte.some((t) => t.includes(n));
}

// Themen nach ihrem ERSTEN Schlagwort bündeln - das ist bei uns per Vorgabe
// der exakte Spielname.
const themen = new Map();
for (const a of artikel) {
  const t = (a.tags ?? [])[0];
  if (!t) continue;
  const schluessel = t.toLowerCase();
  if (KEINE_THEMEN.has(schluessel) || schonVersorgt(t)) continue;
  if (!themen.has(schluessel)) themen.set(schluessel, { name: t, artikel: [] });
  themen.get(schluessel).artikel.push(a);
}

const jetzt = Date.now();
const kandidaten = [...themen.values()]
  .filter((t) => t.artikel.length >= MIN_ARTIKEL)
  .map((t) => {
    const sortiert = [...t.artikel].sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    );
    const juengsteTage = (jetzt - new Date(sortiert[0].publishedAt)) / 86400000;
    return {
      ...t,
      sortiert,
      // Menge zählt, Aktualität auch: Ein Thema, über das wir seit drei Wochen
      // nichts mehr geschrieben haben, interessiert gerade niemanden. Der
      // Bonus verfällt linear über 14 Tage.
      punkte: t.artikel.length + Math.max(0, 14 - juengsteTage) / 2,
      juengsteTage,
    };
  })
  .sort((a, b) => b.punkte - a.punkte);

if (process.argv.includes("--liste")) {
  console.log(`${artikel.length} Artikel, ${themen.size} mögliche Themen, ${kandidaten.length} reif.\n`);
  console.log("Punkte  Artikel  jüngster   Thema");
  console.log("-".repeat(60));
  for (const k of kandidaten.slice(0, 25)) {
    console.log(
      k.punkte.toFixed(1).padStart(6) +
        String(k.artikel.length).padStart(9) +
        `${k.juengsteTage.toFixed(1)} Tage`.padStart(12) +
        "   " + k.name,
    );
  }
  if (guideTexte.length) {
    console.log(`\nBestehende Guides (blockieren ihr Thema): ${guideTexte.length}`);
    for (const t of guideTexte) console.log(`  ${t.slice(0, 70)}`);
  }
  process.exit(0);
}

const beste = kandidaten[0];
if (!beste) {
  console.log("Kein Thema reif für eine Übersicht - nichts zu tun.");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "gefunden=false\n");
  process.exit(0);
}

// Quellen einsammeln: die Originaladressen unserer eigenen Artikel, neueste
// zuerst. Doppelte Adressen fliegen raus, damit die Werkstatt nicht denselben
// Text zweimal lädt.
const quellen = [];
for (const a of beste.sortiert) {
  for (const q of a.sources ?? []) {
    if (q?.url && !quellen.includes(q.url)) quellen.push(q.url);
    if (quellen.length >= MAX_QUELLEN) break;
  }
  if (quellen.length >= MAX_QUELLEN) break;
}

if (quellen.length === 0) {
  console.log(`::warning::"${beste.name}" hat keine verwertbaren Quell-Adressen - übersprungen.`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "gefunden=false\n");
  process.exit(0);
}

const thema = `${beste.name}: Alles Bestätigte im Überblick - was bisher bekannt ist, was noch offen ist, und was davon bestätigt statt vermutet ist`;

console.log(`Thema gewählt: ${beste.name}`);
console.log(`  eigene Artikel:  ${beste.artikel.length}`);
console.log(`  jüngster davon:  vor ${beste.juengsteTage.toFixed(1)} Tagen`);
console.log(`  Punkte:          ${beste.punkte.toFixed(1)}`);
console.log(`  Quellen:         ${quellen.length}`);
for (const q of quellen) console.log(`    ${q}`);
console.log(`\nAuftrag an die Werkstatt:\n  ${thema}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, "gefunden=true\n");
  appendFileSync(process.env.GITHUB_OUTPUT, `thema=${thema}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `quellen=${quellen.join(",")}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `name=${beste.name}\n`);
}
