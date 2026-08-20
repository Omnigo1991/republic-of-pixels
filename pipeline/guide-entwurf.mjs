// GUIDE-WERKSTATT - erzeugt Ratgeber-Artikel, wahlweise als Entwurf oder
// direkt veröffentlicht.
//
// WAS EIN "GUIDE" HIER HEISST: Ein Ratgeber-Artikel wie "Einsteigertipps zu
// STALKER 2" oder "GTA 6: Alles Bestätigte im Überblick". Anders als eine
// News wird so ein Artikel monatelang gelesen, weil jede Woche neue Leute
// das Spiel anfangen und danach googeln.
//
// VOM ENTWURF ZUR AUTOMATIK (Tim-Entscheid 15.08.2026, "Bau das Tor und
// lass laufen"): Ursprünglich erzeugte dieses Skript nur einen Entwurf zum
// Herunterladen - Guides waren neu, nichts Neues geht ungeprüft auf die
// Seite. Statt Tim dauerhaft jeden Guide lesen zu lassen (bei News liest er
// ja auch nicht jeden Artikel), gilt jetzt dieselbe Hausregel wie überall:
// Ein Wächter im Code prüft das ERGEBNIS. Das Faktentreue-Tor
// (lib/faktentor.mjs) hält jede nachprüfbare Behauptung des fertigen Guides
// gegen die Quelltexte - ein Verstoss stoppt die Veröffentlichung.
//
// FAKTENBASIS PFLICHT: Ohne Quelltexte schreibt das Modell aus dem
// Gedächtnis - bei Patch-Ständen und Zahlen ist das gefährlich. Darum
// verlangt das Skript mindestens eine Quell-Adresse und zieht daraus den
// Text als Faktenbasis. Was nicht in den Quellen steht, darf nicht in den
// Guide - und das Tor prüft das nach.
//
// Start: GitHub → Actions → "Guide-Werkstatt" → Run workflow.
//   thema:           z. B. "Einsteigertipps zu STALKER 2 nach Update 2.0"
//   quellen:         eine oder mehrere Adressen, mit Komma getrennt
//   veroeffentlichen: "ja" = nach bestandenem Tor als Artikel committen
//   plattformen:     z. B. "pc,playstation" (nur fürs Veröffentlichen)
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractArticleText } from "./lib/extract.mjs";
import { askClaude, parseJsonResponse, MODELL_TEXT, verbrauchBericht } from "./lib/claude.mjs";
import { umschriebeneUmlaute } from "./lib/umlaut.mjs";
import { pruefeFakten, guideAlsText } from "./lib/faktentor.mjs";
import { validateArticle } from "./lib/validate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUS = join(ROOT, "guide-entwurf");
const ARTICLES_DIR = join(ROOT, "src", "content", "articles");

const SYSTEM = `Du bist Ratgeber-Redaktion von Republic of Pixels, einem deutschsprachigen Gaming-Magazin (SCHWEIZER Rechtschreibung: NIEMALS "ß", immer "ss"; "Republic of Pixels" nie mit Bindestrichen). Du schreibst Guides, die lange gelesen werden: ruhig, präzise, ohne Clickbait und ohne Füllsätze. WICHTIGSTE REGEL: Du behauptest NUR, was die mitgelieferten Quelltexte belegen. Fehlt eine Information, lässt du sie weg - du erfindest keine Werte, keine Patch-Details, keine Tipps.`;

// ---------- Hilfen für die Artikel-Umwandlung ----------

// Slug aus dem Titel: Umlaute werden NUR hier umschrieben - das ist eine
// Web-Adresse, kein Lesetext (die Umlaut-Regel gilt für Anzeigetexte).
export function guideSlug(title) {
  const basis = title
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const kurz = basis.length > 60 ? basis.slice(0, 60).replace(/-[^-]*$/, "") : basis;
  return kurz.startsWith("guide-") ? kurz : `guide-${kurz}`;
}

// Kurzfassung (tldr): die letzte Liste des Guides mit mindestens zwei
// Punkten - Guides enden nach Vorgabe mit einer Checkliste. Fallback:
// die ersten Listenpunkte, egal wo sie stehen.
function ableitenTldr(body) {
  const listen = (body ?? []).filter((b) => b.type === "list" && (b.items ?? []).length >= 2);
  const beste = listen.at(-1) ?? listen[0];
  return (beste?.items ?? []).slice(0, 4).map((i) => (i.length > 180 ? i.slice(0, 177) + "…" : i));
}

// Bild: Guides haben kein eigenes Pressebild. Wir übernehmen das Bild des
// neuesten News-Artikels zum selben Spiel (erster Tag = Spielname) - Credit
// und Quelle bleiben erhalten. Gibt es keines, bleibt das Bild leer und die
// Seite zeigt die prozedurale Hero-Grafik.
export function findeBild(tags, artikelDir = ARTICLES_DIR) {
  const gesucht = (tags ?? []).map((t) => t.toLowerCase());
  let bestes = null;
  for (const f of readdirSync(artikelDir).filter((f) => f.endsWith(".json"))) {
    let a;
    try { a = JSON.parse(readFileSync(join(artikelDir, f), "utf8")); } catch { continue; }
    if (!a.image?.src) continue;
    if (!(a.tags ?? []).some((t) => gesucht.includes(String(t).toLowerCase()))) continue;
    if (!bestes || new Date(a.publishedAt) > new Date(bestes.publishedAt)) {
      bestes = { publishedAt: a.publishedAt, image: a.image };
    }
  }
  return bestes?.image ?? null;
}

// Aus dem Guide-JSON einen vollwertigen Artikel bauen, der dieselbe strenge
// Validierung durchläuft wie jede News (lib/validate.mjs).
export function bauArtikel(guide, { quellenListe, plattformen, jetzt = new Date() }) {
  const stand = guide.stand ? `Stand dieses Guides: ${guide.stand}. Wir halten ihn aktuell, wenn sich Wesentliches ändert.` : null;
  const body = [
    ...(stand ? [{ type: "paragraph", text: stand }] : []),
    ...(guide.body ?? []),
  ];
  const woerter = body
    .map((b) => (b.type === "list" ? (b.items ?? []).join(" ") : b.text ?? ""))
    .join(" ")
    .split(/\s+/).filter(Boolean).length;

  const excerptBasis = `${guide.subtitle ?? ""} ${guide.whyItMatters ?? ""}`.trim();
  const excerpt = excerptBasis.length > 320 ? excerptBasis.slice(0, 317) + "…" : excerptBasis;

  const seoTitle = guide.title.length <= 70 ? guide.title : guide.title.slice(0, 70).replace(/\s+\S*$/, "");
  const metaBasis = guide.subtitle ?? "";
  const metaDescription = metaBasis.length <= 165 ? metaBasis : metaBasis.slice(0, 162).replace(/\s+\S*$/, "") + "…";

  return {
    slug: guideSlug(guide.title),
    title: guide.title,
    subtitle: guide.subtitle,
    excerpt,
    category: "guides",
    platforms: plattformen,
    isTopStory: false,
    popularityRank: null,
    author: "Republic of Pixels Redaktion",
    publishedAt: jetzt.toISOString(),
    readingTimeMinutes: Math.min(30, Math.max(1, Math.round(woerter / 220))),
    heroVariant: "controller",
    image: findeBild(guide.tags),
    isLeakOrRumor: false,
    tags: guide.tags,
    tldr: ableitenTldr(guide.body),
    whyItMatters: guide.whyItMatters,
    poll: null,
    review: null,
    seoTitle,
    metaDescription,
    body,
    sources: quellenListe.map((url) => {
      let host = url;
      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
      return { title: host, url };
    }),
  };
}

// ---------- Hauptlauf ----------

async function main() {
  const thema = (process.env.GUIDE_THEMA ?? "").trim();
  const veroeffentlichen = (process.env.GUIDE_VEROEFFENTLICHEN ?? "").trim() === "ja";
  const plattformen = (process.env.GUIDE_PLATTFORMEN ?? "pc,playstation,xbox")
    .split(",").map((p) => p.trim()).filter(Boolean);
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
      "::error::Keine Quellen angegeben (GUIDE_QUELLEN). Ohne Quelltexte schreibt das Modell aus dem Gedächtnis - das lassen wir nicht zu.",
    );
    process.exit(1);
  }

  console.log(`Thema: ${thema}${veroeffentlichen ? " (mit Veröffentlichung)" : " (nur Entwurf)"}`);
  const quellTexte = [];
  const lesbareQuellen = [];
  for (const url of quellenListe) {
    const ex = await extractArticleText(url, { maxChars: 12000 });
    if (!ex.text || ex.text.length < 300) {
      console.log(`  Quelle nicht lesbar: ${url} (${ex.error ?? "zu wenig Text"})`);
      continue;
    }
    console.log(`  Quelle geladen: ${url} (${ex.text.length} Zeichen)`);
    quellTexte.push(`QUELLE (${url}):\n${ex.text}`);
    lesbareQuellen.push(url);
  }
  if (quellTexte.length === 0) {
    console.log("::error::Keine der Quellen war lesbar - kein Entwurf erstellt.");
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
statt Allgemeinplätzen, am Ende eine Checkliste als Liste. 700 bis 1000
Wörter. Wo eine Angabe vom Patch-Stand abhängt, nenne den Stand ("Stand:
Update 2.0, August 2026") - der Artikel soll auch in Monaten noch brauchbar
sein oder klar zeigen, worauf er sich bezieht.

Antworte NUR mit JSON, erstes Zeichen "{":
{
  "title": "max. 70 Zeichen, sachlich, enthält den Spielnamen",
  "subtitle": "ein Satz: was der Guide liefert",
  "stand": "worauf sich der Guide bezieht, z. B. 'Update 2.0, August 2026'",
  "tags": ["exakter Spielname zuerst", "1-3 weitere Begriffe"],
  "whyItMatters": "2 Sätze: warum dieses Thema Leser gerade beschäftigt (nur aus den Quellen)",
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

  // Umlaut-Wächter auch hier - gleiche Regel wie überall.
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

  // FAKTENTREUE-TOR: das Ergebnis gegen die Quellen halten. Fail-closed -
  // scheitert die Prüfung selbst, wird nichts veröffentlicht.
  let fakten;
  try {
    fakten = await pruefeFakten({ guideText: guideAlsText(guide), quellTexte });
  } catch (err) {
    if (veroeffentlichen) {
      console.log(`::error::Faktentor nicht durchführbar (${err.message}) - Veröffentlichung gestoppt.`);
      process.exit(1);
    }
    console.log(`::warning::Faktentor nicht durchführbar: ${err.message}`);
    fakten = null;
  }
  if (fakten) {
    if (fakten.gedeckt) {
      console.log("Faktentor: bestanden - alle nachprüfbaren Angaben sind durch die Quellen gedeckt.");
    } else {
      for (const v of fakten.verstoesse) {
        console.log(`::warning::Faktentor-Verstoss: "${v.behauptung}" - ${v.problem}`);
      }
    }
  }

  // Lesbare Fassung - bleibt in jedem Fall als Download erhalten.
  const md = [
    `# ${guide.title}`,
    "",
    `*${guide.subtitle}*`,
    "",
    `**Stand:** ${guide.stand ?? "(nicht angegeben)"}`,
    `**Quellen:** ${lesbareQuellen.join(" · ")}`,
    `**Faktentor:** ${fakten ? (fakten.gedeckt ? "bestanden" : `${fakten.verstoesse.length} Beanstandung(en)`) : "nicht durchführbar"}`,
    "",
    "---",
    "",
  ];
  for (const b of guide.body ?? []) {
    if (b.type === "paragraph") md.push(b.text, "");
    else if (b.type === "heading") md.push(`## ${b.text}`, "");
    else if (b.type === "list") md.push(...(b.items ?? []).map((i) => `- ${i}`), "");
  }
  if (fakten && !fakten.gedeckt) {
    md.push("---", "", "## Faktentor-Beanstandungen", "");
    md.push(...fakten.verstoesse.map((v) => `- "${v.behauptung}" - ${v.problem}`), "");
  }
  if (guide.offeneFragen?.length) {
    md.push("---", "", "## Nicht im Guide (von den Quellen nicht gedeckt)", "");
    md.push(...guide.offeneFragen.map((f) => `- ${f}`), "");
  }

  mkdirSync(AUS, { recursive: true });
  writeFileSync(join(AUS, "entwurf.md"), md.join("\n"));
  writeFileSync(join(AUS, "entwurf.json"), JSON.stringify(guide, null, 2) + "\n");
  const woerter = texte.join(" ").split(/\s+/).filter(Boolean).length;
  console.log(`\nEntwurf geschrieben (~${woerter} Wörter).`);

  // ---------- Veröffentlichung ----------
  if (!veroeffentlichen) {
    console.log("Nur Entwurf - es wird nichts veröffentlicht (veroeffentlichen war nicht 'ja').");
    verbrauchBericht();
    return;
  }
  if (fakten && !fakten.gedeckt) {
    console.log(`::error::Faktentor: ${fakten.verstoesse.length} Verstoss/Verstösse - Veröffentlichung gestoppt. Details oben und im Entwurf-Download.`);
    verbrauchBericht();
    process.exit(1);
  }

  const artikel = bauArtikel(guide, { quellenListe: lesbareQuellen, plattformen });
  const slugs = new Set(
    readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")),
  );
  const pruefung = validateArticle(artikel, slugs);
  if (!pruefung.ok) {
    console.log(`::error::Artikel-Validierung fehlgeschlagen - nichts veröffentlicht:\n${pruefung.errors.join("\n")}`);
    verbrauchBericht();
    process.exit(1);
  }

  writeFileSync(join(ARTICLES_DIR, `${artikel.slug}.json`), JSON.stringify(artikel, null, 2) + "\n");
  execFileSync("node", [join(ROOT, "scripts", "generate-article-index.mjs")], { stdio: "inherit" });
  console.log(`Veröffentlicht: src/content/articles/${artikel.slug}.json (Commit übernimmt der Workflow).`);
  verbrauchBericht();
}

// Nur bei Direktstart laufen - beim Import (Tests) passiert nichts.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("Guide-Werkstatt abgebrochen:", err);
    process.exit(1);
  });
}
