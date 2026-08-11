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
import { waehleEinbettungen, gehtUmBewegtbild } from "./lib/embeds.mjs";
import { acquireImage } from "./lib/images.mjs";
import { validateArticle } from "./lib/validate.mjs";
import { pingIndexNow } from "./lib/indexnow.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "pipeline", "state.json");
const ARTICLES_DIR = join(ROOT, "src", "content", "articles");
const PUBLIC_DIR = join(ROOT, "public");

const MAX_ARTICLES_PER_RUN = Number(process.env.MAX_ARTICLES_PER_RUN ?? 2);
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

// Wählt bis zu 3 thematisch nächste Bestandsartikel als relatedSlugs
// (Scoring: gemeinsame Tags > gleiche Kategorie > gemeinsame Plattform,
// leichte Bevorzugung neuerer Artikel). Das Frontend nutzt relatedSlugs
// direkt für die "Ähnliche Artikel"-Sektion → gezielte interne Verlinkung.
function pickRelatedSlugs(article) {
  const scored = [];
  for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const other = JSON.parse(readFileSync(join(ARTICLES_DIR, f), "utf8"));
      if (other.slug === article.slug) continue;
      const otherTags = (other.tags ?? []).map((t) => t.toLowerCase());
      const sharedTags = (article.tags ?? []).filter((t) =>
        otherTags.includes(t.toLowerCase())
      ).length;
      let score = sharedTags * 2;
      if (other.category === article.category) score += 1;
      if ((other.platforms ?? []).some((p) => article.platforms.includes(p))) score += 0.5;
      const ageDays = (Date.now() - new Date(other.publishedAt).getTime()) / 86400000;
      score += Math.max(0, 1 - ageDays / 30);
      if (score > 1) scored.push({ slug: other.slug, score });
    } catch {
      // unlesbare Datei ignorieren
    }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.slug);
}

const EDITORIAL_SYSTEM = `Du bist die Redaktion von Republic of Pixels, einem deutschsprachigen Premium-Gaming-Magazin (republicofpixels.com).

Redaktionelles Profil:
- Zielgruppe: Gamer:innen 18–40, plattformübergreifend (PC, PlayStation, Xbox, Nintendo)
- Ton: sachlich, präzise, journalistisch — wie ein kuratiertes Magazin, nicht wie ein Ticker
- Kein Clickbait, keine Superlative, keine rhetorischen Fragen in Titeln
- Leaks und Gerüchte werden klar als unbestätigt gekennzeichnet
- Sprache: Deutsch in SCHWEIZER Rechtschreibung — NIEMALS "ß", immer "ss" (Musst, gross, heisst); Anrede der Leserschaft neutral oder "ihr", nie "Sie"
- "Republic of Pixels" ist ein Markenname und wird NIEMALS mit Bindestrichen verbunden (kein "Republic-of-Pixels-Redaktion" o. Ä.) — bei Wortverbindungen umschreiben, z. B. "Redaktion von Republic of Pixels"
- Fakten stammen ausschliesslich aus dem gelieferten Quellmaterial — nichts erfinden, keine Zahlen oder Zitate ergänzen, die dort nicht stehen`;

// Zuletzt veröffentlichte Artikel (Titel + Tags) — verhindert bei den häufigen
// Läufen, dass dieselbe Story erneut aufgegriffen wird, wenn eine weitere
// Quelle später darüber berichtet (deren Feed-Eintrag hat einen neuen,
// unbekannten GUID) oder Claude den Titel beim erneuten Verfassen anders
// formuliert. Kein künstliches Slice-Limit mehr auf die Trefferliste — das
// hatte bei mehr als 25 Artikeln im 72h-Fenster ältere Duplikate unsichtbar
// gemacht (Ursache des GTA-6/Netflix-Doppelartikels). Tags werden mitgegeben,
// damit Claude auch bei abweichender Formulierung erkennt, dass es dieselbe
// Story ist — Titelvergleich allein reicht bei umformulierten Meldungen nicht.
function recentPublishedTitles(hours = 72) {
  const cutoff = Date.now() - hours * 3600000;
  const entries = [];
  for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const a = JSON.parse(readFileSync(join(ARTICLES_DIR, f), "utf8"));
      if (new Date(a.publishedAt).getTime() > cutoff) {
        entries.push({ title: a.title, tags: a.tags ?? [] });
      }
    } catch {
      // unlesbare Datei ignorieren
    }
  }
  return entries.slice(-150);
}

async function selectCandidates(candidates) {
  const published = recentPublishedTitles();
  const publishedBlock = published.length
    ? `\nBereits von uns veröffentlicht (diese Storys NICHT erneut auswählen, auch nicht aus anderer Quelle oder mit anderem Titel — vergleiche auch inhaltlich/thematisch anhand der Tags, nicht nur den Titelwortlaut):\n${published.map((p) => `- ${p.title}${p.tags.length ? ` [${p.tags.join(", ")}]` : ""}`).join("\n")}\n`
    : "";
  const list = candidates
    .map(
      (c, i) =>
        `${i} | ${c.feedName} (${c.lang}) | vor ${Math.round((Date.now() - c.publishedAt.getTime()) / 3600000)}h | ${c.title} | ${c.summary.slice(0, 160)}`
    )
    .join("\n");

  const prompt = `Hier ist die Liste neuer Gaming-Meldungen aus unseren Quell-Feeds (Format: Index | Quelle | Alter | Titel | Anriss):

${list}
${publishedBlock}

Aufgaben:
1. Erkenne Duplikate: Meldungen zur selben Nachricht bilden einen Cluster (Indizes zusammenfassen).
2. Wähle die maximal ${MAX_ARTICLES_PER_RUN} relevantesten Cluster für unser Magazin aus. Kriterien: Nachrichtenwert für deutschsprachige Gamer:innen, Aktualität, Substanz. Ausdrücklich erwünscht sind auch Hardware- und Konsolen-Themen mit Gaming-Relevanz: kommende Konsolen und Leaks dazu (z. B. PlayStation 6, nächste Xbox/Project Helix, Switch-Nachfolger), GPUs/CPUs fürs Gaming, Handhelds. NICHT erwünscht: reine Deals-/Gewinnspiel-/Guide-Meldungen, Kleinst-Hardware ohne Gaming-Bezug (Peripherie-Restposten, Büro-Hardware), Meldungen über einzelne Streamer.
3. Pro ausgewähltem Cluster bestimme:
   - "indices": alle zugehörigen Kandidaten-Indizes, den faktenreichsten zuerst
   - "category": "breaking" (nur bei wirklich grossen Nachrichten), "news", "leaks" oder "reviews"
   - "reviews" NUR wählen, wenn der Kandidat selbst ein Test/eine Review eines bereits veröffentlichten Spiels ist (Titel/Anriss enthält klar erkennbar eine Wertung/ein Testurteil, z. B. "review", "test", "im Test") — NICHT für News über ein Spiel oder Ankündigungen
   - "platforms": Teilmenge von ["pc","playstation","xbox","nintendo"]
   - "isLeakOrRumor": true/false
   - "priority": 1 (höchste) bis ${MAX_ARTICLES_PER_RUN}
   - "depth": "kurz" (Routinemeldung, wenig Substanz), "standard" (normale News) oder "lang" (grosse Nachricht mit viel Substanz und Einordnungsbedarf, z. B. Übernahmen, grosse Ankündigungen, Branchenbeben, Tests)

Antworte NUR mit JSON, ohne Einleitung und ohne Kommentar — das erste Zeichen deiner Antwort muss "{" sein: {"selected":[{"indices":[...],"category":"...","platforms":[...],"isLeakOrRumor":...,"priority":...,"depth":"..."}]}
Wenn nichts den Kriterien genügt, antworte {"selected":[]}.`;

  // Ein fehlgeschlagener Parse wird einmal wiederholt — die Auswahl ist der
  // einzige Schritt, an dem der ganze Lauf hängt.
  for (let attempt = 0; ; attempt++) {
    try {
      const raw = await askClaude({ system: EDITORIAL_SYSTEM, prompt, maxTokens: 3000 });
      return parseJsonResponse(raw).selected ?? [];
    } catch (err) {
      if (attempt >= 1) throw err;
      console.log(`  Auswahl fehlgeschlagen (${err.message}) — Wiederholung`);
    }
  }
}

async function generateArticle(cluster, clusterItems, sourceTexts, slugs) {
  const istReview = cluster.category === "reviews";
  // Tests brauchen Substanz für Stärken/Schwächen — nie als "kurz" generieren,
  // selbst wenn die Auswahl das fälschlich so eingestuft hat.
  const depth = istReview && cluster.depth === "kurz" ? "standard" : cluster.depth;

  const sourcesBlock = clusterItems
    .map((it, i) => {
      const text = sourceTexts[i];
      return `QUELLE ${i + 1}: ${it.feedName} — "${it.title}" (${it.link})\n${text || "(Volltext nicht abrufbar — nutze den Feed-Anriss)"}\nFeed-Anriss: ${it.summary}`;
    })
    .join("\n\n---\n\n");

  const reviewHinweis = istReview
    ? `\n- Dies ist eine Testzusammenfassung: Das "review"-Feld fasst das Urteil der zitierten Quelle(n) zusammen — erfinde KEINE eigenen, unabhängigen Spielerfahrungen. Formuliere "verdict" so, dass klar wird, dass es die Einordnung der Kritik wiedergibt (z. B. "Die Kritik bewertet …").`
    : "";

  const reviewFeld = istReview
    ? `,
  "review": {
    "label": "einer von genau diesen fünf Werten: Essenziell | Klare Empfehlung | Empfehlenswert | Für den Sale vormerken | Nicht empfohlen — entsprechend dem Gesamturteil der Quelle",
    "strengths": ["2–4 Stärken laut Quelle"],
    "weaknesses": ["1–3 Schwächen laut Quelle"],
    "forWhom": "1 Satz: für wen sich das Spiel eignet",
    "verdict": "2–3 Sätze Gesamteinschätzung, gestützt auf die zitierte Kritik",
    "recommendation": "1 Satz Kauf-/Wartenempfehlung"
  }`
    : `,
  "review": null`;

  const prompt = `Verfasse auf Basis des folgenden Quellmaterials einen eigenständigen deutschen Magazin-Artikel. Der Artikel darf keine Übersetzung und keine Paraphrase der Quelle sein, sondern eine eigene journalistische Aufbereitung der Fakten.

${sourcesBlock}

Vorgaben:
- Kategorie: ${cluster.category}${cluster.isLeakOrRumor ? " (als unbestätigt kennzeichnen!)" : ""}${reviewHinweis}
- Umfang: ${
    { kurz: "250–350", standard: "350–550", lang: "550–750" }[depth] ?? "350–550"
  } Wörter im body — die Länge muss dem Nachrichtenwert entsprechen, kein Aufblähen
- Struktur: Einstieg mit dem Kern der Nachricht, ${
    depth === "lang" ? "3–4" : "2–3"
  } Zwischenüberschriften, am Ende eine kurze Einordnung
- PFLICHT (fester Artikel-Bauplan): Direkt nach dem ersten Absatz folgt ein stats-Block {"type":"stats","items":[{"value":"...","label":"..."}]} mit den 1–3 stärksten ZAHLEN der Story (Preis, Datum, Verkaufszahl, Prozent …) — value kurz und plakativ (z. B. "80 $", "19. Nov.", "5 Mrd. $"), label ein erklärender Halbsatz. NUR Zahlen aus dem Quellmaterial, nichts erfinden. Hat die Story wirklich keine starke Zahl, lasse den Block weg.
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
  "body": [{"type":"paragraph","text":"..."},{"type":"stats","items":[{"value":"...","label":"..."}]},{"type":"heading","text":"..."},{"type":"list","items":["..."]},{"type":"quote","text":"nur echte Zitate aus der Quelle","attribution":"..."}],
  "poll": {"question":"EINE meinungsstarke, konkrete Frage zur Story für die Community (kein Ja/Nein-Langweiler, sondern die Streitfrage der Story)","options":["2–4 kurze, pointierte Antwortoptionen"]},
  "isLeakOrRumor": ${cluster.isLeakOrRumor}${reviewFeld}
}
Hinweis zu body: quote-Blöcke nur verwenden, wenn die Quelle ein wörtliches Zitat enthält. Zitate werden IMMER auf DEUTSCH wiedergegeben (Tim-Vorgabe 08.08.2026 — nicht alle Leser:innen können gut Englisch): fremdsprachige Originale präzise und neutral übersetzen, nichts zuspitzen oder weglassen; attribution bleibt die Person/Quelle.`;

  const raw = await askClaude({ system: EDITORIAL_SYSTEM, prompt, maxTokens: 8000 });
  // Sicherheitsnetz Schweizer Rechtschreibung: ß kommt nie auf die Seite.
  const draft = JSON.parse(JSON.stringify(parseJsonResponse(raw)).replaceAll("\u00df", "ss").replaceAll("ß", "ss"));

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
    // Dedupe nach URL: Zwei Feed-Items desselben Clusters können auf
    // denselben Beitrag zeigen — der erzeugte Artikel listete die Quelle
    // dann doppelt (von Tim am 07.08.2026 bemerkt).
    sources: clusterItems
      .filter((it, i, arr) => arr.findIndex((o) => o.link === it.link) === i)
      .slice(0, 2)
      .map((it) => ({
        title: it.title,
        url: it.link,
        publisher: it.feedName,
      })),
    review: istReview ? (draft.review ?? null) : null,
    image: null,
  };
}

// Korrekturlese-Pass (Betreiber-Vorgabe 08.08.2026, Anlass: "Erdgebnis"
// statt "Ergebnis" im Cloud-Gaming-Artikel): Ein separater, eng geführter
// Claude-Durchgang sucht NUR Tippfehler/Buchstabendreher — keine
// Stiländerungen. Wörtliche Zitate (quote-Blöcke) bleiben unangetastet,
// ebenso Slug, URLs und Quellen. Schlägt der Pass fehl, erscheint der
// Artikel unkorrigiert (Korrektur darf den Publish nie blockieren).
async function proofreadArticle(article) {
  const pruefText = [
    article.title,
    article.subtitle,
    article.excerpt,
    ...(article.tldr ?? []),
    article.whyItMatters,
    ...(article.body ?? [])
      .filter((b) => b.type !== "quote")
      .map((b) => (b.type === "list" ? (b.items ?? []).join("\n") : b.text ?? "")),
    article.poll?.question,
    ...(article.poll?.options ?? []),
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Korrekturlesen — finde AUSSCHLIESSLICH echte Fehler: Tippfehler, Buchstabendreher, Rechtschreib- und Grammatikfehler. KEINE Stil- oder Formulierungsänderungen. SCHWEIZER Rechtschreibung ist vorgegeben: "ss" statt "ß" ist KORREKT und kein Fehler. Eigennamen (Spiele, Firmen, Personen) nie "korrigieren".

TEXT:
${pruefText}

Antworte NUR mit JSON, erstes Zeichen "{": {"fixes":[{"falsch":"exakter fehlerhafter Ausschnitt (mind. ganzes Wort)","richtig":"Korrektur"}]}
Wenn fehlerfrei: {"fixes":[]}`;

  try {
    const raw = await askClaude({ system: EDITORIAL_SYSTEM, prompt, maxTokens: 1200 });
    const fixes = (parseJsonResponse(raw).fixes ?? []).filter(
      (f) =>
        typeof f.falsch === "string" &&
        typeof f.richtig === "string" &&
        f.falsch.length >= 4 &&
        f.falsch !== f.richtig
    );
    if (fixes.length === 0) return article;

    // Typsicher (Fix 09.08.2026): Stats-Kacheln haben Objekt-Einträge
    // ({value, label}) — ein replaceAll auf Objekten liess das gesamte
    // Korrekturlesen bei jedem Artikel mit Zahlen-Kacheln still scheitern
    // ("s.replaceAll is not a function").
    const fixText = (s) => {
      if (typeof s !== "string") return s;
      for (const f of fixes) s = s.replaceAll(f.falsch, f.richtig);
      return s;
    };
    const fixItem = (it) =>
      typeof it === "string"
        ? fixText(it)
        : it && typeof it === "object"
          ? { ...it, ...(typeof it.label === "string" ? { label: fixText(it.label) } : {}) }
          : it;
    for (const k of ["title", "subtitle", "excerpt", "seoTitle", "metaDescription", "whyItMatters"]) {
      if (typeof article[k] === "string") article[k] = fixText(article[k]);
    }
    article.tldr = (article.tldr ?? []).map(fixText);
    if (article.poll) {
      article.poll.question = fixText(article.poll.question);
      article.poll.options = (article.poll.options ?? []).map(fixText);
    }
    article.body = (article.body ?? []).map((b) =>
      b.type === "quote"
        ? b
        : {
            ...b,
            ...(typeof b.text === "string" ? { text: fixText(b.text) } : {}),
            ...(Array.isArray(b.items) ? { items: b.items.map(fixItem) } : {}),
          }
    );
    console.log(`  Korrektur: ${fixes.map((f) => `${f.falsch}→${f.richtig}`).join(", ")}`);
  } catch (err) {
    console.log(`  Korrekturlesen übersprungen (${err.message})`);
  }
  return article;
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
    .filter((it) => !state.seen[hashId(it.guid)])
    // Bei 26 Feeds: nur die 150 neuesten Kandidaten in die Auswahl geben,
    // damit der Auswahl-Prompt fokussiert bleibt.
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 150);

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
  const publishedSlugs = [];
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
        it.embed = ex.embed;
        it.embeds = ex.embeds;
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

      article = await proofreadArticle(article);
      article.relatedSlugs = pickRelatedSlugs(article);

      // Einbettungen der Quelle (Trailer, Tweet eines Leaks, Reddit-Thread)
      // direkt nach dem einleitenden Absatz — die KI erzeugt die URLs nicht
      // selbst, um Tippfehler und Fehlzuordnungen zu vermeiden.
      //
      // NACH GEGENSTAND STATT NACH RANGFOLGE (Tim, 11.08.2026): Vorher galt
      // stur X vor Reddit vor YouTube. Da auf Nachrichtenseiten fast immer
      // ein X-Link steht, verdrängte er den Trailer auch dann, wenn die
      // Meldung vom Trailer handelte — geprüft an sechs Video-Storys: vier
      // ganz ohne Einbettung, eine mit Tweet statt Video. Handelt die Story
      // von Bewegtbild, gewinnt jetzt das Video; sonst bleibt es beim Tweet
      // als Beleg. Beides zusammen ist erlaubt, wenn beides vorliegt: erst
      // ansehen, dann die Quelle dazu.
      // VORERST NUR EINE EINBETTUNG (Tim, 11.08.2026): waehleEinbettungen()
      // liefert die vollständige Rangfolge, wir nehmen aber nur die erste.
      // Grund: Zwei Zustimmungsboxen direkt untereinander wirken schwerfällig
      // — beide sehen gleich aus, bevor der Leser klickt. Die Auswahl ist der
      // Gewinn, das Doppel wäre nur ein Extra. Sobald die Optik dafür steht,
      // genügt es, diese Begrenzung zu lockern.
      // Platzierung unverändert: direkt nach dem Einleitungsabsatz.
      const [einbettung] = waehleEinbettungen(
        article,
        items.map((it) => it.embeds ?? {}),
      );
      if (einbettung) {
        article.body.splice(1, 0, {
          type: "embed",
          platform: einbettung.platform,
          url: einbettung.url,
        });
        const art = gehtUmBewegtbild(article) ? " (Bewegtbild-Story)" : "";
        console.log(`  Embed: ${einbettung.platform}${art}`);
      }

      console.log("  Bild beschaffen (Feed/Quelle) …");
      article.image = await acquireImage({
        slug: article.slug,
        items,
        altText: article.title,
        publicDir: PUBLIC_DIR,
      });
      console.log(`  Bild: ${article.image ? article.image.credit : "Placeholder"}`);

      writeFileSync(
        join(ARTICLES_DIR, `${article.slug}.json`),
        JSON.stringify(article, null, 2) + "\n"
      );
      slugs.add(article.slug);
      publishedSlugs.push(article.slug);
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

  if (publishedSlugs.length) {
    const urls = [
      "https://www.republicofpixels.com/",
      ...publishedSlugs.map((s) => `https://www.republicofpixels.com/artikel/${s}`),
    ];
    await pingIndexNow(urls);
  }

  console.log(`5/5 Fertig: ${published} Artikel geschrieben, State aktualisiert.`);
}

main().catch((err) => {
  console.error("Pipeline-Abbruch:", err);
  process.exit(1);
});
