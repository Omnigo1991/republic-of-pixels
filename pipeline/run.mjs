// News-Pipeline von Republic of Pixels.
// Läuft alle 30 Minuten via GitHub Actions (.github/workflows/news-pipeline.yml):
//   Feeds abrufen → neue Meldungen erkennen → TAKT PRÜFEN → per Claude auswählen
//   & clustern → eigenständige deutsche Artikel generieren → validieren → Bild
//   beschaffen → JSON + Bild schreiben → Workflow committet & Vercel deployt.
// DRY_RUN=1: nur Feeds + Kandidatenliste, keine API-Aufrufe, keine Schreibzugriffe.
//
// HÄUFIG SCHAUEN, GLEICH VIEL SCHREIBEN (Tim, 27.08.2026): Der Lauf findet
// alle 30 Minuten statt, damit wir bei einem Leak nicht bis zu vier Stunden
// hinterherhinken. Wie viel dabei erscheinen darf, entscheidet lib/takt.mjs -
// ein Tagesbudget mit Tageskurve. Ohne diese Bremse hätte der schnellere Takt
// bei zwei Artikeln je Lauf bis zu 96 Artikel am Tag erzeugt. Die meisten
// Läufe enden deshalb VOR dem ersten Modellaufruf und kosten fast nichts.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { FEEDS } from "./feeds.mjs";
import { fetchAllFeeds } from "./lib/rss.mjs";
import {
  askClaude,
  parseJsonResponse,
  verbrauchBericht,
  ClaudeAblehnung,
  MODELL_URTEIL,
  MODELL_TEXT,
  MODELL_HANDWERK,
} from "./lib/claude.mjs";
import { extractArticleText } from "./lib/extract.mjs";
import { waehleEinbettungen, gehtUmBewegtbild } from "./lib/embeds.mjs";
import { acquireImage } from "./lib/images.mjs";
import { validateArticle } from "./lib/validate.mjs";
import { umschriebeneUmlaute } from "./lib/umlaut.mjs";
import { pingIndexNow } from "./lib/indexnow.mjs";
import { taktEntscheid, TAGESBUDGET } from "./lib/takt.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "pipeline", "state.json");
const ARTICLES_DIR = join(ROOT, "src", "content", "articles");
const PUBLIC_DIR = join(ROOT, "public");

const MAX_ARTICLES_PER_RUN = Number(process.env.MAX_ARTICLES_PER_RUN ?? 2);
// Manueller Nachzug (Tim, 23.08.2026, nach dem verpassten Elite-3-Leak):
// MANUAL_URLS umgeht die Feeds und schickt vorgegebene Quell-Links durch
// die NORMALE Strecke - Auswahl, Generierung und alle Wächter unverändert.
const MANUAL_URLS = (process.env.MANUAL_URLS ?? "").split(/[\s,]+/).filter(Boolean);
const MAX_CANDIDATE_AGE_H = 48;
const STATE_RETENTION_DAYS = 21;
// WIE OFT EIN KANDIDAT ANTRETEN DARF, bevor er begraben wird.
//
// Stand bis zum 27.08.2026 auf 3 und passte zum alten Vier-Stunden-Takt: Ein
// Kandidat hatte damit rund zwölf Stunden Zeit, in die Auswahl zu kommen. Mit
// dem 30-Minuten-Takt finden Auswahlen deutlich häufiger statt - dieselben
// drei Runden wären nach anderthalb Stunden aufgebraucht gewesen, und wir
// hätten MEHR Storys verpasst als vorher, also genau das Gegenteil des Ziels
// (der verpasste Elite-3-Leak am 23.08. war der Anlass für die Mehrfach-
// chancen überhaupt). 8 Runden halten das Zeitfenster ungefähr gleich gross.
const MAX_AUSWAHLRUNDEN = 8;
// EILMELDUNGS-BETRIEB (Tim, 27.08.2026). Gesetzt vom Workflow
// "Eilmeldungs-Lauf", der alle 30 Minuten prueft. In diesem Modus
// veroeffentlicht die Pipeline NUR, wenn auffaellig viele Quellen
// gleichzeitig dasselbe melden - und dann genau einen Artikel. Instagram,
// Deals, Charts und das Pixel-Raetsel bleiben aussen vor: Die haengen am
// regulaeren Vier-Stunden-Lauf und haben ihre eigene Tageskurve, an der ein
// haeufigerer Takt nicht ziehen darf.
const NUR_EIL = process.env.NUR_EILMELDUNG === "1";
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
- Zielgruppe: Gamer:innen 18-40, plattformübergreifend (PC, PlayStation, Xbox, Nintendo)
- Ton: sachlich, präzise, journalistisch - wie ein kuratiertes Magazin, nicht wie ein Ticker
- Schlagzeilen dürfen SPANNUNG aufbauen - mit echten Fragen, einer Wendung oder der Folge für die Leserschaft. Die Grenze: Jede Frage wird im Artikel beantwortet, jede Wendung steht im Artikel, nichts wird übertrieben. Verboten bleiben leere Neugier-Floskeln ("Du glaubst nicht, was dann geschah"), Superlative ohne Beleg und Fragen, die der Artikel nicht beantwortet
- Leaks und Gerüchte werden klar als unbestätigt gekennzeichnet
- Sprache: Deutsch in SCHWEIZER Rechtschreibung - NIEMALS "ß", immer "ss" (Musst, gross, heisst); Anrede der Leserschaft neutral oder "ihr", nie "Sie"
- "Republic of Pixels" ist ein Markenname und wird NIEMALS mit Bindestrichen verbunden (kein "Republic-of-Pixels-Redaktion" o. Ä.) - bei Wortverbindungen umschreiben, z. B. "Redaktion von Republic of Pixels"
- Fakten stammen ausschliesslich aus dem gelieferten Quellmaterial - nichts erfinden, keine Zahlen oder Zitate ergänzen, die dort nicht stehen`;

// Zuletzt veröffentlichte Artikel (Titel + Tags) - verhindert bei den häufigen
// Läufen, dass dieselbe Story erneut aufgegriffen wird, wenn eine weitere
// Quelle später darüber berichtet (deren Feed-Eintrag hat einen neuen,
// unbekannten GUID) oder Claude den Titel beim erneuten Verfassen anders
// formuliert. Kein künstliches Slice-Limit mehr auf die Trefferliste - das
// hatte bei mehr als 25 Artikeln im 72h-Fenster ältere Duplikate unsichtbar
// gemacht (Ursache des GTA-6/Netflix-Doppelartikels). Tags werden mitgegeben,
// damit Claude auch bei abweichender Formulierung erkennt, dass es dieselbe
// Story ist - Titelvergleich allein reicht bei umformulierten Meldungen nicht.
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

// Veröffentlichungszeitpunkte ALLER Artikel - Grundlage für die Tageszählung
// in lib/takt.mjs. Bewusst aus den Dateien und nicht aus state.json: Die
// Dateien sind die Wahrheit und zählen sich auch nach einem abgebrochenen
// Lauf wieder richtig.
function veroeffentlichteZeitpunkte() {
  const liste = [];
  for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const a = JSON.parse(readFileSync(join(ARTICLES_DIR, f), "utf8"));
      if (a.publishedAt) liste.push({ publishedAt: a.publishedAt });
    } catch {
      // unlesbare Datei ignorieren
    }
  }
  return liste;
}

async function selectCandidates(candidates, maxAnzahl = MAX_ARTICLES_PER_RUN) {
  const published = recentPublishedTitles();
  const publishedBlock = published.length
    ? `\nBereits von uns veröffentlicht (diese Storys NICHT erneut auswählen, auch nicht aus anderer Quelle oder mit anderem Titel - vergleiche auch inhaltlich/thematisch anhand der Tags, nicht nur den Titelwortlaut):\n${published.map((p) => `- ${p.title}${p.tags.length ? ` [${p.tags.join(", ")}]` : ""}`).join("\n")}\n`
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
2. Wähle die maximal ${maxAnzahl} relevantesten Cluster für unser Magazin aus. Kriterien: Nachrichtenwert für deutschsprachige Gamer:innen, Aktualität, Substanz.
   AUSDRÜCKLICH ERWÜNSCHT sind auch MENSCHLICHE GESCHICHTEN aus der Gaming-Welt, nicht nur Ankündigungen (Tim, 24.08.2026): Sammlerstücke mit überraschendem Wert, Fundstücke und Jubiläen ("vor 22 Jahren verkaufte sich..."), erstaunliche Spielerleistungen, kuriose Entdeckungen in alten Spielen, Geschichten hinter der Entwicklung. Solche Meldungen haben oft wenig klassischen Nachrichtenwert, aber hohen Erzählwert - Leute lesen und teilen sie, weil sie etwas fühlen. Der Massstab hier ist nicht "wie wichtig", sondern "erzählt das jemand weiter". EINE davon pro Lauf ist gut, mehr nicht - wir bleiben eine Nachrichtenseite. Ausdrücklich erwünscht sind auch Hardware- und Konsolen-Themen mit Gaming-Relevanz: kommende Konsolen und Leaks dazu (z. B. PlayStation 6, nächste Xbox/Project Helix, Switch-Nachfolger), GPUs/CPUs fürs Gaming, Handhelds, sowie offizielle First-Party-Controller und -Zubehör (z. B. ein neuer Elite-Controller oder DualSense-Nachfolger) - auch als Leak. NICHT erwünscht: reine Deals-/Gewinnspiel-/Guide-Meldungen (auch nicht als "menschliche Geschichte" getarnt - ein LEGO-Set bei Edeka bleibt eine Deal-Meldung), Dritthersteller-Kleinst-Hardware ohne Gaming-Bezug (Peripherie-Restposten, Büro-Hardware), Meldungen über einzelne Streamer und ihren Alltag.
3. Pro ausgewähltem Cluster bestimme:
   - "indices": alle zugehörigen Kandidaten-Indizes, den faktenreichsten zuerst
   - "category": "breaking" (nur bei wirklich grossen Nachrichten), "news", "leaks" oder "reviews"
   - "reviews" NUR wählen, wenn der Kandidat selbst ein Test/eine Review eines bereits veröffentlichten Spiels ist (Titel/Anriss enthält klar erkennbar eine Wertung/ein Testurteil, z. B. "review", "test", "im Test") - NICHT für News über ein Spiel oder Ankündigungen
   - "platforms": Teilmenge von ["pc","playstation","xbox","nintendo"]
   - "bereich": "hardware" oder "games". Hardware sind Meldungen ueber GERAETE - Grafikkarten, Prozessoren, Konsolen als Produkt (Preis, Absatz, Technik), Controller, Handhelds, Monitore, Speicher, Peripherie. Alles andere ist "games", auch wenn eine Hardware-Firma vorkommt: "Sony kuendigt Spiel an" ist games, "Sony senkt den PS5-Preis" ist hardware. Ein Test zaehlt dorthin, wo der Gegenstand gehoert - ein Laptop-Test ist hardware, ein Spiele-Test ist games.
   - "isLeakOrRumor": true/false
   - "priority": 1 (höchste) bis ${maxAnzahl}
   - "depth": "kurz" (Routinemeldung, wenig Substanz), "standard" (normale News) oder "lang" (grosse Nachricht mit viel Substanz und Einordnungsbedarf, z. B. Übernahmen, grosse Ankündigungen, Branchenbeben, Tests)

Antworte NUR mit JSON, ohne Einleitung und ohne Kommentar - das erste Zeichen deiner Antwort muss "{" sein: {"selected":[{"indices":[...],"category":"...","platforms":[...],"bereich":"games oder hardware","isLeakOrRumor":...,"priority":...,"depth":"..."}]}
Wenn nichts den Kriterien genügt, antworte {"selected":[]}.`;

  // Ein fehlgeschlagener Parse wird einmal wiederholt - die Auswahl ist der
  // einzige Schritt, an dem der ganze Lauf hängt.
  for (let attempt = 0; ; attempt++) {
    try {
      // URTEILSAUFGABE (Tim, 14.08.2026): Ein einziger Aufruf entscheidet,
      // worüber wir überhaupt schreiben. Greift der daneben, hilft das beste
      // Schreibmodell nichts mehr. Budget von 3000 auf 6000 erhöht, weil
      // Opus vor der Antwort länger nachdenkt und sich das Budget mit der
      // Antwort teilt (siehe Hinweis in claude.mjs).
      const raw = await askClaude({
        system: EDITORIAL_SYSTEM,
        prompt,
        maxTokens: 6000,
        model: MODELL_URTEIL,
      });
      return parseJsonResponse(raw).selected ?? [];
    } catch (err) {
      // Eine Ablehnung wiederholt sich zwangsläufig - nicht nochmal fragen.
      if (err instanceof ClaudeAblehnung) throw err;
      if (attempt >= 1) throw err;
      console.log(`  Auswahl fehlgeschlagen (${err.message}) - Wiederholung`);
    }
  }
}

// EXPORTIERT UND MIT WAEHLBAREM MODELL (14.08.2026): Damit laesst sich
// derselbe Quelltext von zwei Modellen schreiben und nebeneinander lesen -
// die Grundlage fuer Tims Entscheid, ob der Artikeltext auf das staerkere
// Modell wechselt. Ohne Argument bleibt alles wie bisher.
export async function generateArticle(cluster, clusterItems, sourceTexts, slugs, modell = MODELL_TEXT) {
  const istReview = cluster.category === "reviews";
  // Tests brauchen Substanz für Stärken/Schwächen - nie als "kurz" generieren,
  // selbst wenn die Auswahl das fälschlich so eingestuft hat.
  const depth = istReview && cluster.depth === "kurz" ? "standard" : cluster.depth;

  const sourcesBlock = clusterItems
    .map((it, i) => {
      const text = sourceTexts[i];
      return `QUELLE ${i + 1}: ${it.feedName} - "${it.title}" (${it.link})\n${text || "(Volltext nicht abrufbar - nutze den Feed-Anriss)"}\nFeed-Anriss: ${it.summary}`;
    })
    .join("\n\n---\n\n");

  const reviewHinweis = istReview
    ? `\n- Dies ist eine Testzusammenfassung: Das "review"-Feld fasst das Urteil der zitierten Quelle(n) zusammen - erfinde KEINE eigenen, unabhängigen Spielerfahrungen. Formuliere "verdict" so, dass klar wird, dass es die Einordnung der Kritik wiedergibt (z. B. "Die Kritik bewertet …").`
    : "";

  const reviewFeld = istReview
    ? `,
  "review": {
    "label": "einer von genau diesen fünf Werten: Essenziell | Klare Empfehlung | Empfehlenswert | Für den Sale vormerken | Nicht empfohlen - entsprechend dem Gesamturteil der Quelle",
    "strengths": ["2-4 Stärken laut Quelle"],
    "weaknesses": ["1-3 Schwächen laut Quelle"],
    "forWhom": "1 Satz: für wen sich das Spiel eignet",
    "verdict": "2-3 Sätze Gesamteinschätzung, gestützt auf die zitierte Kritik",
    "recommendation": "1 Satz Kauf-/Wartenempfehlung"
  }`
    : `,
  "review": null`;

  const prompt = `Verfasse auf Basis des folgenden Quellmaterials einen eigenständigen deutschen Magazin-Artikel. Der Artikel darf keine Übersetzung und keine Paraphrase der Quelle sein, sondern eine eigene journalistische Aufbereitung der Fakten.

${sourcesBlock}

Vorgaben:
- Kategorie: ${cluster.category}${cluster.isLeakOrRumor ? " (als unbestätigt kennzeichnen!)" : ""}${reviewHinweis}
- Umfang: ${
    { kurz: "400-500", standard: "550-700", lang: "750-950" }[depth] ?? "550-700"
  } Wörter im body - die Länge muss dem Nachrichtenwert entsprechen, aber NICHT durch Wiederholungen oder Floskeln gestreckt werden. Mehr Länge heisst mehr SUBSTANZ: Vorgeschichte, Einordnung, Folgen für Spielerinnen und Spieler, Bezug zu früheren Ereignissen
- Struktur: Einstieg mit dem Kern der Nachricht, ${
    depth === "lang" ? "4-5" : "3-4"
  } Zwischenüberschriften, am Ende eine kurze Einordnung
- PFLICHT (fester Artikel-Bauplan): Direkt nach dem ersten Absatz folgt ein stats-Block {"type":"stats","items":[{"value":"...","label":"..."}]} mit den 1-3 stärksten ZAHLEN der Story (Preis, Datum, Verkaufszahl, Prozent …) - value kurz und plakativ (z. B. "80 $", "19. Nov.", "5 Mrd. $"), label ein erklärender Halbsatz. NUR Zahlen aus dem Quellmaterial, nichts erfinden. Hat die Story wirklich keine starke Zahl, lasse den Block weg.
- Bereits vergebene Slugs (nicht wiederverwenden): ${[...slugs].slice(-40).join(", ")}

Antworte NUR mit einem JSON-Objekt mit exakt diesen Feldern:
{
  "slug": "kebab-case, kurz, sprechend, ggf. mit Jahr",
  "title": "Titel, 40-80 Zeichen - siehe Schlagzeilen-Handwerk unten",
  "subtitle": "1 Satz Unterzeile, die den Titel ergänzt - OHNE Punkt am Ende (Fragezeichen und Ausrufezeichen sind erlaubt)",
  "excerpt": "Teaser 120-260 Zeichen für Cards und Meta-Fallback - endet mit einem offenen Faden, nicht mit der kompletten Auflösung",
  "seoTitle": "max. 65 Zeichen, wichtigstes Keyword vorn",
  "metaDescription": "140-160 Zeichen, aktiv formuliert",
  "category": "${cluster.category}",
  "platforms": ${JSON.stringify(cluster.platforms)},
  "bereich": ${JSON.stringify(cluster.bereich === "hardware" ? "hardware" : "games")},
  "tags": ["3-6 prägnante Tags, z. B. Spielname, Studio, Plattform"],
  "tldr": ["3-4 Stichpunkte mit den Kernfakten"],
  "whyItMatters": "2-3 Sätze: Warum ist das für Gamer:innen relevant?",
  "body": [{"type":"paragraph","text":"..."},{"type":"stats","items":[{"value":"...","label":"..."}]},{"type":"heading","text":"..."},{"type":"list","items":["..."]},{"type":"quote","text":"nur echte Zitate aus der Quelle","attribution":"..."}],
  "poll": {"question":"EINE meinungsstarke, konkrete Frage zur Story für die Community (kein Ja/Nein-Langweiler, sondern die Streitfrage der Story)","options":["2-4 kurze, pointierte Antwortoptionen"]},
  "isLeakOrRumor": ${cluster.isLeakOrRumor}${reviewFeld}
}
Hinweis zu body: quote-Blöcke nur verwenden, wenn die Quelle ein wörtliches Zitat enthält. Zitate werden IMMER auf DEUTSCH wiedergegeben (Tim-Vorgabe 08.08.2026 - nicht alle Leser:innen können gut Englisch): fremdsprachige Originale präzise und neutral übersetzen, nichts zuspitzen oder weglassen; attribution bleibt die Person/Quelle.

SCHLAGZEILEN-HANDWERK (Tim-Vorgabe 15.08.2026 - gilt für title, subtitle und excerpt):
Eine Schlagzeile, die alles verrät, gibt keinen Grund zu klicken. Baue Spannung mit einem dieser vier Mittel - wähle das, das zur Story passt, und wechsle ab:
1. ECHTE FRAGE, die der Artikel beantwortet: "Verkaufssorgen trotz Top-Wertungen?"
2. WENDUNG nach dem Gedankenstrich - der zweite Teil dreht den ersten: "Cloud-Version abgeschaltet - trotz Kauf"
3. ZITAT als Aufhänger, wenn die Quelle ein starkes wörtliches Zitat hat: "«Xbox versteht keine Videospiele» - Entwickler kritisiert Entlassungen"
4. FOLGE für die Leserschaft - was heisst das für mich: "…doch die dürfte teuer werden"

Beispiele (vorher brav → nachher mit Spannung, beide faktentreu):
- "Campaign Evolved erhält Update gegen Bugs" → "Halo repariert die Kampagne - wer mittendrin steckt, verliert den Spielstand"
- "Pokémon Pokopia verkauft sich über 5 Millionen Mal" → "Nur ein Spiel verkauft sich auf Switch 2 besser - Pokopia knackt 5 Millionen"
- "Update 2.0 bringt neue Waffen und A-Life-Verbesserungen" → "Stalker 2 macht die Zone schlauer - und den Nebel gefährlich"

Grenzen (unverhandelbar): Die Wendung oder Antwort steht IM Artikel. Konkrete, sinnliche Wörter statt Systembegriffe ("der Nebel wird gefährlich" statt "A-Life-Verbesserungen"). Nicht jede Schlagzeile braucht ein Stilmittel - eine starke Nachricht darf nüchtern bleiben ("GTA 6 kostet 80 Dollar").`;

  // Artikeltext bleibt vorerst auf Sonnet (MODELL_TEXT) - der Wechsel auf
  // Opus wartet auf Tims direkten Vergleich an denselben Quellen. Budget von
  // 8000 auf 12000 erhöht: Das Nachdenken teilt sich das Budget mit der
  // Antwort, und genau dieser Abbruch kostete am 10.08. zwei Posts.
  const raw = await askClaude({
    system: EDITORIAL_SYSTEM,
    prompt,
    maxTokens: 12000,
    model: modell,
  });
  // Sicherheitsnetz Schweizer Rechtschreibung: ß kommt nie auf die Seite.
  const draft = JSON.parse(JSON.stringify(parseJsonResponse(raw)).replaceAll("\u00df", "ss").replaceAll("ß", "ss"));

  // AUSGESCHRIEBENE UMLAUTE (Tim, 14.08.2026): "ueberrascht" statt
  // "überrascht" und Verwandtes. Hier nur eine WARNUNG, nicht wie bei
  // Instagram ein Verwerfen - und das ist eine bewusste Abwägung:
  //   - Ein Artikel ist lang; die Trefferfläche für einen Fehlalarm bei
  //     einem Eigennamen ist deutlich grösser als bei einer Schlagzeile.
  //   - Website-Text lässt sich nachträglich korrigieren, ein geposteter
  //     Instagram-Beitrag mit eingebranntem Text nicht.
  // Die Warnung färbt den Lauf sichtbar, statt still durchzulassen.
  // NUR DEN TEXT PRUEFEN, NICHT DAS JSON (Fehler 14.08.2026): Die erste
  // Fassung gab JSON.stringify(draft) hinein. Satzzeichen und Feldnamen
  // klebten dort an echte Woerter - der Lauf um 11:00 meldete drei
  // Fehlalarme, alle aus JSON-Syntax. Gesammelt werden jetzt nur die
  // Zeichenketten-Werte, also der Text, den Leser sehen.
  const textStuecke = [];
  (function sammle(x) {
    if (typeof x === "string") textStuecke.push(x);
    else if (Array.isArray(x)) x.forEach(sammle);
    else if (x && typeof x === "object") Object.values(x).forEach(sammle);
  })(draft);
  const umlautFunde = umschriebeneUmlaute(textStuecke.join(" "));
  if (umlautFunde.length) {
    console.log(
      `::warning::Ausgeschriebene Umlaute im Artikel "${draft.title ?? "?"}": ${[...new Set(umlautFunde)].slice(0, 12).join(", ")}`,
    );
  }

  // UNTERZEILE OHNE SCHLUSSPUNKT (Tim, 13.08.2026): Von 172 Artikeln endeten
  // 97 mit Punkt und 75 ohne - reiner Zufall, weil die Vorgabe im Prompt
  // dazu schwieg. Die Unterzeile ist ein Teaser, kein Fliesstext; ohne Punkt
  // liest sie sich leichter. Die Regel steht jetzt im Prompt UND hier: Eine
  // Regel, die nur im Prompt steht, ist keine Regel (Lehre aus dem
  // Schlagzeilen-Wächter vom 11.08.2026). Fragezeichen, Ausrufezeichen und
  // Auslassungspunkte bleiben unangetastet.
  // Abkürzungen behalten ihren Punkt - er gehört zum Wort, nicht zum Satz.
  const ABKUERZUNG_AM_ENDE = /\b(usw|etc|u\.\s?a|o\.\s?Ä|u\.\s?Ä|ff)\.$/i;
  if (typeof draft.subtitle === "string") {
    const s = draft.subtitle.trim();
    draft.subtitle = ABKUERZUNG_AM_ENDE.test(s) ? s : s.replace(/(?<!\.)\.$/, "");
  }

  // Von der Pipeline kontrollierte Felder - das Modell entscheidet hier nicht.
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
    // denselben Beitrag zeigen - der erzeugte Artikel listete die Quelle
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
// Claude-Durchgang sucht NUR Tippfehler/Buchstabendreher - keine
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

  const prompt = `Korrekturlesen - finde AUSSCHLIESSLICH echte Fehler: Tippfehler, Buchstabendreher, Rechtschreib- und Grammatikfehler. KEINE Stil- oder Formulierungsänderungen. SCHWEIZER Rechtschreibung ist vorgegeben: "ss" statt "ß" ist KORREKT und kein Fehler. Eigennamen (Spiele, Firmen, Personen) nie "korrigieren".

TEXT:
${pruefText}

Antworte NUR mit JSON, erstes Zeichen "{": {"fixes":[{"falsch":"exakter fehlerhafter Ausschnitt (mind. ganzes Wort)","richtig":"Korrektur"}]}
Wenn fehlerfrei: {"fixes":[]}`;

  try {
    // HANDWERK, BEWUSST DAS KLEINERE MODELL (Tim, 14.08.2026): Dieser
    // Schritt darf AUSSCHLIESSLICH Tippfehler finden. Opus 5 neigt dazu,
    // einen Auftrag auszuweiten und ungefragt Formulierungen zu verbessern -
    // hier wäre das kein Gewinn, sondern ein Risiko. Denktiefe "low", weil
    // Rechtschreibung kein Nachdenken braucht.
    //
    // Budget von 1200 auf 3000: Auch bei geringer Denktiefe teilt sich das
    // Nachdenken das Budget mit der Antwort. 1200 war dafür zu knapp.
    const raw = await askClaude({
      system: EDITORIAL_SYSTEM,
      prompt,
      maxTokens: 3000,
      model: MODELL_HANDWERK,
      effort: "low",
    });
    const fixes = (parseJsonResponse(raw).fixes ?? []).filter(
      (f) =>
        typeof f.falsch === "string" &&
        typeof f.richtig === "string" &&
        f.falsch.length >= 4 &&
        f.falsch !== f.richtig &&
        // KEINE KORREKTUR, DIE DEN ORIGINALTEXT ENTHÄLT (Tim hat am
        // 27.08.2026 die Schlagzeile "Der nächsten Xbox könnte das Laufwerk
        // fehlen könnte das Laufwerk fehlen - weil es niemand mehr baut"
        // gefunden). Die Ersetzung laeuft ueber replaceAll: Steht der
        // fehlerhafte Ausschnitt auch in der Korrektur, wird der Text an
        // dieser Stelle verdoppelt statt berichtigt. Eine echte
        // Tippfehlerkorrektur sieht nie so aus.
        !f.richtig.includes(f.falsch) &&
        // Und keine, die den Text mehr als verdoppelt: Korrekturlesen soll
        // Buchstaben tauschen, nicht Saetze anbauen.
        f.richtig.length <= f.falsch.length * 2 + 20
    );
    if (fixes.length === 0) return article;

    // Typsicher (Fix 09.08.2026): Stats-Kacheln haben Objekt-Einträge
    // ({value, label}) - ein replaceAll auf Objekten liess das gesamte
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

// Baut aus vorgegebenen URLs Kandidaten für die normale Auswahl: Titel und
// Anriss kommen aus dem <title>- bzw. description-Tag der Quellseite.
async function manuelleKandidaten(urls) {
  const items = [];
  for (const url of urls) {
    let titel = url;
    let anriss = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", Accept: "text/html,*/*" },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      const html = await res.text();
      const t = html.match(/<title[^>]*>([^<]+)</i);
      if (t) titel = t[1].trim();
      const d =
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i) ||
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
      if (d) anriss = d[1];
    } catch (err) {
      console.log(`  Warnung: ${url} nicht lesbar (${err.message}) - Titel bleibt die URL`);
    }
    items.push({
      guid: url,
      link: url,
      title: titel,
      summary: anriss,
      feedId: "manuell",
      feedName: "Manuell",
      lang: "en",
      publishedAt: new Date(),
    });
  }
  return items;
}

async function main() {
  console.log(
    `Pipeline-Lauf ${new Date().toISOString()}` +
      (NUR_EIL ? " [Eilmeldungs-Betrieb]" : ` (max. ${MAX_ARTICLES_PER_RUN} Artikel)`),
  );
  const state = loadState();
  const slugs = existingSlugs();

  console.log(MANUAL_URLS.length ? `1/6 Manueller Lauf: ${MANUAL_URLS.length} vorgegebene Quellen` : "1/6 Feeds abrufen …");
  const results = MANUAL_URLS.length
    ? [{ items: await manuelleKandidaten(MANUAL_URLS) }]
    : await fetchAllFeeds(FEEDS);
  const cutoff = Date.now() - MAX_CANDIDATE_AGE_H * 3600000;
  // DREI CHANCEN STATT EINER (Tim, 23.08.2026): Vorher wurde jeder
  // Kandidat nach EINEM Lauf als gesehen begraben - wer in einem
  // nachrichtenstarken Lauf nicht unter die Top 2 kam, war für immer weg
  // (so verpassten wir den Elite-3-Leak). Jetzt darf ein Kandidat bis zu
  // drei Auswahlrunden antreten, danach ist Schluss.
  const verbraucht = (eintrag) =>
    !!eintrag && (typeof eintrag === "string" ? true : (eintrag.n ?? MAX_AUSWAHLRUNDEN) >= MAX_AUSWAHLRUNDEN);
  const candidates = results
    .flatMap((r) => r.items)
    .filter((it) => it.publishedAt && it.publishedAt.getTime() > cutoff)
    .filter((it) => !verbraucht(state.seen[hashId(it.guid)]))
    // Bei 26 Feeds: nur die 150 neuesten Kandidaten in die Auswahl geben,
    // damit der Auswahl-Prompt fokussiert bleibt.
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 150);

  console.log(`2/6 ${candidates.length} neue Kandidaten (Fenster ${MAX_CANDIDATE_AGE_H}h)`);
  if (candidates.length === 0) {
    console.log("Nichts Neues - Lauf beendet.");
    return;
  }
  // DER TAKT-RIEGEL (Tim, 27.08.2026). Ab hier kostet jeder Schritt Geld,
  // deshalb steht die Entscheidung davor. Die meisten der 48 Tagesläufe enden
  // genau hier, ohne einen einzigen Modellaufruf.
  //
  // WICHTIG: Der Riegel liegt VOR der Markierung "gesehen" am Ende von main().
  // Ein Kandidat, der wegen des Tempos nicht drankommt, verbraucht also keine
  // seiner Auswahlrunden und tritt im nächsten Lauf unverändert wieder an.
  // Andernfalls hätte der schnellere Takt Storys verbrannt, statt sie zu
  // finden.
  //
  // Der manuelle Nachzug (MANUAL_URLS) umgeht den Riegel: Wer eine Quelle von
  // Hand einwirft, will sie veröffentlicht sehen, nicht vertröstet.
  const takt = taktEntscheid({
    artikel: veroeffentlichteZeitpunkte(),
    kandidaten: candidates,
    // Der Eilmeldungs-Lauf schreibt hoechstens EINEN Artikel. Er ist der
    // schnelle Zubringer fuer eine einzelne grosse Meldung, nicht ein
    // zweiter regulaerer Lauf - alles Weitere holt der normale Takt.
    proLauf: NUR_EIL ? 1 : MAX_ARTICLES_PER_RUN,
    nurEil: NUR_EIL,
  });
  console.log(`3/6 Takt: ${takt.grund} [Budget ${TAGESBUDGET}/Tag]`);

  if (process.env.DRY_RUN) {
    for (const c of candidates.slice(0, 40)) console.log(`  [${c.feedId}] ${c.title}`);
    console.log(
      `DRY_RUN - Ende vor Auswahl/Generierung. Der Lauf wuerde ${
        takt.schreiben ? `bis zu ${takt.hoechstens} Artikel schreiben` : "nichts schreiben"
      }.`,
    );
    return;
  }

  if (!takt.schreiben && !MANUAL_URLS.length) {
    console.log("Lauf endet ohne Modellaufruf.");
    return;
  }
  const hoechstens = MANUAL_URLS.length ? MAX_ARTICLES_PER_RUN : takt.hoechstens;

  console.log(`4/6 Auswahl & Clustering (Claude), höchstens ${hoechstens} …`);
  const selected = (await selectCandidates(candidates, hoechstens))
    .filter((s) => Array.isArray(s.indices) && s.indices.every((i) => candidates[i]))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, hoechstens);
  console.log(`  ${selected.length} Cluster ausgewählt`);

  let published = 0;
  const publishedSlugs = [];
  for (const cluster of selected) {
    const items = cluster.indices.map((i) => candidates[i]);
    const label = items[0].title.slice(0, 70);
    try {
      console.log(`5/6 Generiere: ${label}`);
      const sourceTexts = [];
      for (const it of items.slice(0, 2)) {
        const ex = await extractArticleText(it.link);
        sourceTexts.push(ex.text);
        it.ogImage = ex.ogImage;
        it.embed = ex.embed;
        it.embeds = ex.embeds;
      }

      let article = await generateArticle(cluster, items, sourceTexts, slugs);
      let check = validateArticle(article, slugs, cluster.depth);
      if (!check.ok) {
        console.log(`  Validierung fehlgeschlagen (${check.errors.join("; ")}) - 1 Wiederholung`);
        article = await generateArticle(cluster, items, sourceTexts, slugs);
        check = validateArticle(article, slugs, cluster.depth);
      }
      if (!check.ok) {
        console.log(`  Verworfen: ${check.errors.join("; ")}`);
        continue;
      }

      article = await proofreadArticle(article);
      article.relatedSlugs = pickRelatedSlugs(article);

      // Einbettungen der Quelle (Trailer, Tweet eines Leaks, Reddit-Thread)
      // direkt nach dem einleitenden Absatz - die KI erzeugt die URLs nicht
      // selbst, um Tippfehler und Fehlzuordnungen zu vermeiden.
      //
      // NACH GEGENSTAND STATT NACH RANGFOLGE (Tim, 11.08.2026): Vorher galt
      // stur X vor Reddit vor YouTube. Da auf Nachrichtenseiten fast immer
      // ein X-Link steht, verdrängte er den Trailer auch dann, wenn die
      // Meldung vom Trailer handelte - geprüft an sechs Video-Storys: vier
      // ganz ohne Einbettung, eine mit Tweet statt Video. Handelt die Story
      // von Bewegtbild, gewinnt jetzt das Video; sonst bleibt es beim Tweet
      // als Beleg. Beides zusammen ist erlaubt, wenn beides vorliegt: erst
      // ansehen, dann die Quelle dazu.
      // VORERST NUR EINE EINBETTUNG (Tim, 11.08.2026): waehleEinbettungen()
      // liefert die vollständige Rangfolge, wir nehmen aber nur die erste.
      // Grund: Zwei Zustimmungsboxen direkt untereinander wirken schwerfällig
      // - beide sehen gleich aus, bevor der Leser klickt. Die Auswahl ist der
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
      // Ablehnung getrennt ausweisen: Das ist kein Fehler in unserem Code,
      // sondern eine Entscheidung des Modells (typisch bei Hack- und
      // Leak-Themen). Der Cluster fällt weg, der Lauf geht weiter.
      if (err instanceof ClaudeAblehnung) {
        console.log(`  Abgelehnt bei "${label}" (${err.kategorie ?? "ohne Kategorie"}) - Cluster übersprungen`);
      } else {
        console.log(`  Fehler bei "${label}": ${err.message} - Cluster übersprungen`);
      }
    }
  }

  // Alle geprüften Kandidaten als gesehen markieren (auch abgelehnte), damit
  // sie im nächsten Lauf nicht erneut bewertet werden. State-Einträge älter
  // als STATE_RETENTION_DAYS werden entfernt.
  const now = new Date().toISOString();
  const gewaehlt = new Set(selected.flatMap((s) => s.indices.map((i) => candidates[i]?.guid)));
  for (const c of candidates) {
    const k = hashId(c.guid);
    const alt = state.seen[k];
    // Gewählte Kandidaten sind endgültig verbraucht; nicht gewählte
    // sammeln eine Runde und dürfen (bis n=3) erneut antreten. Alte
    // Einträge im Zeitstempel-Format gelten als verbraucht.
    const runden = typeof alt === "object" && alt ? (alt.n ?? MAX_AUSWAHLRUNDEN) + 1 : 1;
    state.seen[k] = {
      t: now,
      n: gewaehlt.has(c.guid) ? MAX_AUSWAHLRUNDEN : Math.min(runden, MAX_AUSWAHLRUNDEN),
    };
  }
  const keepAfter = Date.now() - STATE_RETENTION_DAYS * 86400000;
  for (const [k, v] of Object.entries(state.seen)) {
    const zeit = typeof v === "string" ? v : v?.t;
    if (new Date(zeit).getTime() < keepAfter) delete state.seen[k];
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");

  if (publishedSlugs.length) {
    const urls = [
      "https://www.republicofpixels.com/",
      ...publishedSlugs.map((s) => `https://www.republicofpixels.com/artikel/${s}`),
    ];
    await pingIndexNow(urls);
  }

  // GUIDE-PFLEGE, STUFE 1 (Tim-Entscheid 15.08.2026): Guides veralten,
  // wenn zum selben Spiel Neues passiert - ein GTA-6-Sammelguide muss von
  // jeder neuen GTA-6-Meldung wissen. Diese Stufe ERKENNT das nur und
  // meldet es sichtbar im Lauf-Protokoll; aktualisiert wird über die
  // Guide-Werkstatt (gleiches Thema, neue Quelle dazu). Automatische
  // Aktualisierung kommt erst, wenn sich die Erkennung bewährt hat.
  if (publishedSlugs.length) {
    const guides = [];
    for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))) {
      try {
        const a = JSON.parse(readFileSync(join(ARTICLES_DIR, f), "utf8"));
        if (a.category === "guides") guides.push(a);
      } catch {}
    }
    for (const slug of publishedSlugs) {
      let neu;
      try { neu = JSON.parse(readFileSync(join(ARTICLES_DIR, `${slug}.json`), "utf8")); } catch { continue; }
      const neueTags = (neu.tags ?? []).map((t) => String(t).toLowerCase());
      for (const g of guides) {
        // Erster Tag = Spielname (Konvention aus getRelated) - nur der
        // zählt, sonst schlagen Allerwelts-Tags wie "Update" ständig an.
        const spiel = String(g.tags?.[0] ?? "").toLowerCase();
        if (spiel && neueTags.includes(spiel)) {
          console.log(`::warning::Guide möglicherweise veraltet: "${g.title}" (${g.slug}) - neue Meldung zum selben Spiel: ${slug}. Aktualisieren über Guide-Werkstatt (gleiches Thema, neue Quelle dazu).`);
        }
      }
    }
  }

  console.log(`6/6 Fertig: ${published} Artikel geschrieben, State aktualisiert.`);
  verbrauchBericht();
}

// NUR BEIM DIREKTEN AUFRUF STARTEN (14.08.2026): Vorher lief die ganze
// Pipeline schon beim blossen Importieren dieser Datei - damit war keine
// einzelne Funktion daraus pruefbar, ohne echte Artikel zu veroeffentlichen.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Pipeline-Abbruch:", err);
    process.exit(1);
  });
}
