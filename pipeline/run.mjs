// News-Pipeline von Republic of Pixels.
// Läuft alle 6 Stunden via GitHub Actions (.github/workflows/news-pipeline.yml):
//   Feeds abrufen → neue Meldungen erkennen → per Claude auswählen & clustern
//   → eigenständige deutsche Artikel generieren → validieren → Bild beschaffen
//   → JSON + Bild schreiben → Workflow committet & Vercel deployt.
// DRY_RUN=1: nur Feeds + Kandidatenliste, keine API-Aufrufe, keine Schreibzugriffe.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { FEEDS } from "./feeds.mjs";
import { fetchAllFeeds } from "./lib/rss.mjs";
import { askClaude, parseJsonResponse } from "./lib/claude.mjs";
import { extractArticleText } from "./lib/extract.mjs";
import { acquireImage } from "./lib/images.mjs";
import { validateArticle } from "./lib/validate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "pipeline", "state.json");
const ARTICLES_DIR = join(ROOT, "src", "content", "articles");
const PUBLIC_DIR = join(ROOT, "public");

const MAX_ARTICLES_PER_RUN = Number(process.env.MAX_ARTICLES_PER_RUN ?? 3);
const MAX_CANDIDATE_AGE_H = 48;
const STATE_RETENTION_DAYS = 21;
const HERO_VARIANTS = ["circuit", "controller", "particles", "waveform", "grid"];

const hashId = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { seen: {} };
  }
}

function existingSlugs() {
  const slugs = new Set();
  for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      slugs.add(JSON.parse(readFileSync(join(ARTICLES_DIR, f), "utf8")).slug);
    } catch {
      // defekte Datei blockiert den Lauf nicht; der Index-Generator meldet sie
    }
  }
  return slugs;
}

const EDITORIAL_SYSTEM = `Du bist die Redaktion von Republic of Pixels, einem deutschsprachigen Premium-Gaming-Magazin (republicofpixels.com).

Redaktionelles Profil:
- Zielgruppe: Gamer:innen 18–40, plattformübergreifend (PC, PlayStation, Xbox, Nintendo)
- Ton: sachlich, präzise, journalistisch — wie ein kuratiertes Magazin, nicht wie ein Ticker
- Kein Clickbait, keine Superlative, keine rhetorischen Fragen in Titeln
- Leaks und Gerüchte werden klar als unbestätigt gekennzeichnet
- Sprache: Deutsch (de-DE), Anrede der Leserschaft neutral oder "ihr", nie "Sie"
- Fakten stammen ausschliesslich aus dem gelieferten Quellmaterial — nichts erfinden, keine Zahlen oder Zitate ergänzen, die dort nicht stehen`;

async function selectCandidates(candidates) {
  const list = candidates
    .map(
      (c, i) =>
        `${i} | ${c.feedName} (${c.lang}) | vor ${Math.round((Date.now() - c.publishedAt.getTime()) / 3600000)}h | ${c.title} | ${c.summary.slice(0, 160)}`
    )
    .join("\n");

  const prompt = `Hier ist die Liste neuer Gaming-Meldungen aus unseren Quell-Feeds (Format: Index | Quelle | Alter | Titel | Anriss):

${list}

Aufgaben:
1. Erkenne Duplikate: Meldungen zur selben Nachricht bilden einen Cluster (Indizes zusammenfassen).
2. Wähle die maximal ${MAX_ARTICLES_PER_RUN} relevantesten Cluster für unser Magazin aus. Kriterien: Nachrichtenwert für deutschsprachige Gamer:innen, Aktualität, Substanz (keine reinen Deals-/Gewinnspiel-/Guide-Meldungen, keine Hardware-Kleinstmeldungen, keine Meldungen über einzelne Streamer).
3. Pro ausgewähltem Cluster bestimme:
   - "indices": alle zugehörigen Kandidaten-Indizes, den faktenreichsten zuerst
   - "category": "breaking" (nur bei wirklich grossen Nachrichten), "news" oder "leaks"
   - "platforms": Teilmenge von ["pc","playstation","xbox","nintendo"]
   - "gameName": exakter Spielname für die Artwork-Suche im Steam-Store, oder null wenn kein einzelnes Spiel im Zentrum steht
   - "isLeakOrRumor": true/false
   - "priority": 1 (höchste) bis ${MAX_ARTICLES_PER_RUN}

Antworte NUR mit JSON: {"selected":[{"indices":[...],"category":"...","platforms":[...],"gameName":...,"isLeakOrRumor":...,"priority":...}]}
Wenn nichts den Kriterien genügt, antworte {"selected":[]}.`;

  const raw = await askClaude({ system: EDITORIAL_SYSTEM, prompt, maxTokens: 2000 });
  return parseJsonResponse(raw).selected ?? [];
}

async function generateArticle(cluster, clusterItems, sourceTexts, slugs) {
  const sourcesBlock = clusterItems
    .map((it, i) => {
      const text = sourceTexts[i];
      return `QUELLE ${i + 1}: ${it.feedName} — "${it.title}" (${it.link})\n${text || "(Volltext nicht abrufbar — nutze den Feed-Anriss)"}\nFeed-Anriss: ${it.summary}`;
    })
    .join("\n\n---\n\n");

  const prompt = `Verfasse auf Basis des folgenden Quellmaterials einen eigenständigen deutschen Magazin-Artikel. Der Artikel darf keine Übersetzung und keine Paraphrase der Quelle sein, sondern eine eigene journalistische Aufbereitung der Fakten.

${sourcesBlock}

Vorgaben:
- Kategorie: ${cluster.category}${cluster.isLeakOrRumor ? " (als unbestätigt kennzeichnen!)" : ""}
- Umfang: 350–600 Wörter im body
- Struktur: Einstieg mit dem Kern der Nachricht, 2–3 Zwischenüberschriften, am Ende eine kurze Einordnung
- Bereits vergebene Slugs (nicht wiederverwenden): ${[...slugs].slice(-40).join(", ")}

Antworte NUR mit einem JSON-Objekt mit exakt diesen Feldern:
{
  "slug": "kebab-case, kurz, sprechend, ggf. mit Jahr",
  "title": "Titel, 40–80 Zeichen, informativ, kein Clickbait",
  "subtitle": "1 Satz Unterzeile, die den Titel ergänzt",
  "excerpt": "Teaser 120–260 Zeichen für Cards und Meta-Fallback",
  "seoTitle": "max. 65 Zeichen, wichtigstes Keyword vorn",
  "metaDescription": "140–160 Zeichen, aktiv formuliert",
  "category": "${cluster.category}",
  "platforms": ${JSON.stringify(cluster.platforms)},
  "tags": ["3–6 prägnante Tags, z. B. Spielname, Studio, Plattform"],
  "tldr": ["3–4 Stichpunkte mit den Kernfakten"],
  "whyItMatters": "2–3 Sätze: Warum ist das für Gamer:innen relevant?",
  "body": [{"type":"paragraph","text":"..."},{"type":"heading","text":"..."},{"type":"list","items":["..."]},{"type":"quote","text":"nur echte Zitate aus der Quelle","attribution":"..."}],
  "isLeakOrRumor": ${cluster.isLeakOrRumor}
}
Hinweis zu body: quote-Blöcke nur verwenden, wenn die Quelle ein wörtliches Zitat enthält.`;

  const raw = await askClaude({ system: EDITORIAL_SYSTEM, prompt, maxTokens: 8000 });
  const draft = parseJsonResponse(raw);

  // Von der Pipeline kontrollierte Felder — das Modell entscheidet hier nicht.
  const words = (draft.body ?? [])
    .map((b) => (b.type === "list" ? (b.items ?? []).join(" ") : b.text ?? ""))
    .join(" ")
    .split(/\s+/).length;
  const primary = clusterItems[0];

  return {
    ...draft,
    isTopStory: false,
    popularityRank: null,
    author: "Republic of Pixels Redaktion",
    publishedAt: new Date().toISOString(),
    readingTimeMinutes: Math.max(1, Math.round(words / 220)),
    heroVariant: HERO_VARIANTS[parseInt(hashId(draft.slug ?? primary.link), 16) % HERO_VARIANTS.length],
    sources: clusterItems.slice(0, 2).map((it) => ({
      title: it.title,
      url: it.link,
      publisher: it.feedName,
    })),
    review: null,
    image: null,
  };
}

async function main() {
  console.log(`Pipeline-Lauf ${new Date().toISOString()} (max. ${MAX_ARTICLES_PER_RUN} Artikel)`);
  const state = loadState();
  const slugs = existingSlugs();

  console.log("1/5 Feeds abrufen …");
  const results = await fetchAllFeeds(FEEDS);
  const cutoff = Date.now() - MAX_CANDIDATE_AGE_H * 3600000;
  const candidates = results
    .flatMap((r) => r.items)
    .filter((it) => it.publishedAt && it.publishedAt.getTime() > cutoff)
    .filter((it) => !state.seen[hashId(it.guid)]);

  console.log(`2/5 ${candidates.length} neue Kandidaten (Fenster ${MAX_CANDIDATE_AGE_H}h)`);
  if (candidates.length === 0) {
    console.log("Nichts Neues — Lauf beendet.");
    return;
  }
  if (process.env.DRY_RUN) {
    for (const c of candidates.slice(0, 40)) console.log(`  [${c.feedId}] ${c.title}`);
    console.log("DRY_RUN — Ende vor Auswahl/Generierung.");
    return;
  }

  console.log("3/5 Auswahl & Clustering (Claude) …");
  const selected = (await selectCandidates(candidates))
    .filter((s) => Array.isArray(s.indices) && s.indices.every((i) => candidates[i]))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_ARTICLES_PER_RUN);
  console.log(`  ${selected.length} Cluster ausgewählt`);

  let published = 0;
  for (const cluster of selected) {
    const items = cluster.indices.map((i) => candidates[i]);
    const label = items[0].title.slice(0, 70);
    try {
      console.log(`4/5 Generiere: ${label}`);
      const sourceTexts = [];
      for (const it of items.slice(0, 2)) {
        const ex = await extractArticleText(it.link);
        sourceTexts.push(ex.text);
        it.ogImage = ex.ogImage;
      }

      let article = await generateArticle(cluster, items, sourceTexts, slugs);
      let check = validateArticle(article, slugs);
      if (!check.ok) {
        console.log(`  Validierung fehlgeschlagen (${check.errors.join("; ")}) — 1 Wiederholung`);
        article = await generateArticle(cluster, items, sourceTexts, slugs);
        check = validateArticle(article, slugs);
      }
      if (!check.ok) {
        console.log(`  Verworfen: ${check.errors.join("; ")}`);
        continue;
      }

      console.log(`  Bild beschaffen (gameName: ${cluster.gameName ?? "—"}) …`);
      article.image = await acquireImage({
        slug: article.slug,
        gameName: cluster.gameName,
        feedItem: items[0],
        altText: article.title,
        publicDir: PUBLIC_DIR,
      });
      console.log(`  Bild: ${article.image ? article.image.credit : "Placeholder"}`);

      writeFileSync(
        join(ARTICLES_DIR, `${article.slug}.json`),
        JSON.stringify(article, null, 2) + "\n"
      );
      slugs.add(article.slug);
      published++;
      console.log(`  ✓ Veröffentlicht: ${article.slug} (${check.wordCount} Wörter)`);
    } catch (err) {
      console.log(`  Fehler bei "${label}": ${err.message} — Cluster übersprungen`);
    }
  }

  // Alle geprüften Kandidaten als gesehen markieren (auch abgelehnte), damit
  // sie im nächsten Lauf nicht erneut bewertet werden. State-Einträge älter
  // als STATE_RETENTION_DAYS werden entfernt.
  const now = new Date().toISOString();
  for (const c of candidates) state.seen[hashId(c.guid)] = now;
  const keepAfter = Date.now() - STATE_RETENTION_DAYS * 86400000;
  for (const [k, v] of Object.entries(state.seen)) {
    if (new Date(v).getTime() < keepAfter) delete state.seen[k];
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");

  console.log(`5/5 Fertig: ${published} Artikel geschrieben, State aktualisiert.`);
}

main().catch((err) => {
  console.error("Pipeline-Abbruch:", err);
  process.exit(1);
});
