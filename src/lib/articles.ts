import type { Article, Bereich, Category, Platform } from "./types";
import { ALL_ARTICLES } from "./articles.generated";

export function getAllArticles(): Article[] {
  return [...ALL_ARTICLES].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getArticleBySlug(slug: string): Article | undefined {
  return ALL_ARTICLES.find((a) => a.slug === slug);
}

const TOP_STORY_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function getTopStory(): Article {
  // Eine manuell markierte Top-Story gilt maximal 48 h - danach übernimmt
  // automatisch der neueste Artikel, damit die Startseite nie veraltet wirkt.
  const flagged = ALL_ARTICLES.find(
    (a) =>
      a.isTopStory &&
      Date.now() - new Date(a.publishedAt).getTime() < TOP_STORY_MAX_AGE_MS
  );
  return flagged ?? getAllArticles()[0];
}

// "Beliebt bei Lesern" mit ECHTEN Aufrufzahlen (Betreiber-Wunsch 07.08.2026):
// liest die aggregierte 7-Tage-Ansicht artikel_aufrufe (Supabase-View über
// page_views, nur Slug + Anzahl). Der Abruf passiert beim Build - die
// Startseite wird bei jedem Pipeline-Deploy (~alle 3 Std.) neu gebaut, die
// Rangliste bleibt also aktuell. Fällt bei jedem Fehler lautlos auf die
// bisherige Logik (neueste Artikel) zurück.
export async function getPopularArticlesLive(limit = 5): Promise<Article[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return getPopularArticles(limit);
    const res = await fetch(
      `${url}/rest/v1/artikel_aufrufe?select=slug,aufrufe&order=aufrufe.desc&limit=40`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return getPopularArticles(limit);
    const rows: { slug: string; aufrufe: number }[] = await res.json();
    const ranked = rows
      .map((r) => getArticleBySlug(r.slug))
      .filter((a): a is Article => Boolean(a));
    if (ranked.length === 0) return getPopularArticles(limit);
    const fill = getAllArticles().filter(
      (a) => !ranked.some((r) => r.slug === a.slug)
    );
    return [...ranked, ...fill].slice(0, limit);
  } catch {
    return getPopularArticles(limit);
  }
}

export function getPopularArticles(limit = 5): Article[] {
  const ranked = ALL_ARTICLES.filter((a) => a.popularityRank !== null).sort(
    (a, b) => (a.popularityRank as number) - (b.popularityRank as number)
  );
  // Solange keine echten Popularitätsdaten (Analytics) einfliessen, wird mit
  // den neuesten Artikeln aufgefüllt, damit die Sektion nie leer bleibt.
  if (ranked.length < limit) {
    const fill = getAllArticles().filter(
      (a) => !ranked.some((r) => r.slug === a.slug)
    );
    return [...ranked, ...fill].slice(0, limit);
  }
  return ranked.slice(0, limit);
}

export function getChronological(excludeSlug?: string): Article[] {
  return getAllArticles().filter((a) => a.slug !== excludeSlug);
}

export function getByCategory(category: Category): Article[] {
  return getAllArticles().filter((a) => a.category === category);
}

// RESSORT-ZUORDNUNG (Tim, 24.08.2026).
//
// Neue Artikel bringen das Feld "bereich" mit, das die Redaktion setzt.
// Für die rund 400 Artikel davor braucht es eine Herleitung - und die
// bleibt bewusst hier im Code statt in einem Einmal-Skript: So gilt für
// alte und neue Artikel dieselbe Definition, und wer sie ändert, ändert
// sie an einer Stelle.
//
// Die Wortliste ist an unserem eigenen Bestand geprüft, nicht geraten. Sie
// fragt nach GERÄTEN, nicht nach Firmen: "Sony kündigt Spiel an" ist Games,
// "Sony senkt PS5-Preis" ist Hardware.
//
// GEPRÜFT WIRD NUR DER TITEL. Erster Versuch nahm Untertitel und Tags dazu
// und lieferte 42 statt 23 Treffer - darunter ein Koop-Rätselspiel, weil in
// seinen Tags "Steam Deck" als unterstützte Plattform stand, und eine
// Zelda-VR-Mod wegen des Wortes "Headset" im Untertitel. Eine
// Nebenerwähnung macht einen Artikel nicht zum Hardware-Artikel; der Titel
// sagt, worum es geht.
const HARDWARE_WOERTER =
  /\b(RTX|Radeon|GeForce|Ryzen|Threadripper|Intel Core|GPU|CPU|APU|Grafikkarte|Prozessor|Chipsatz|Monitor|Headset|Kopfhörer|Maus|Tastatur|Controller|DualSense|Joy-Con|Handheld|Steam Deck|ROG Ally|SSD|NAND|Netzteil|Mainboard|Arbeitsspeicher|Laptop|Notebook|Lüfter|Kühler|Latenz|Razer|Logitech|Corsair|SteelSeries|ASUS|MSI|Gigabyte|Nvidia|Sandisk|TSMC)\b/i;

/** Ressort eines Artikels - gesetztes Feld schlägt die Herleitung. */
export function bereichVonArtikel(a: Article): Bereich {
  if (a.bereich) return a.bereich;
  return HARDWARE_WOERTER.test(a.title) ? "hardware" : "games";
}

export function getByBereich(bereich: Bereich): Article[] {
  return getChronological().filter((a) => bereichVonArtikel(a) === bereich);
}

export function getByPlatform(platform: Platform): Article[] {
  return getAllArticles().filter((a) => a.platforms.includes(platform));
}

export function getRelated(article: Article, limit = 3): Article[] {
  if (article.relatedSlugs?.length) {
    const explicit = article.relatedSlugs
      .map((slug) => getArticleBySlug(slug))
      .filter((a): a is Article => Boolean(a));
    if (explicit.length >= limit) return explicit.slice(0, limit);
  }
  // GLEICHES SPIEL ZUERST (14.08.2026): Vorher zählte nur die Rubrik - in
  // einem STALKER-Artikel empfahl die eingeschobene Karte deshalb ARC
  // Raiders, schlicht die neueste News derselben Rubrik. Der erste Tag ist
  // der wichtigste Hinweis auf das Thema (Spielname), darum gewinnt er.
  // Für Guides ist das Pflicht, für News eine Verbesserung.
  const sameTags = getAllArticles().filter(
    (a) =>
      a.slug !== article.slug &&
      (a.tags ?? []).some((t) => (article.tags ?? []).includes(t))
  );
  const sameCategory = getAllArticles().filter(
    (a) => a.slug !== article.slug && a.category === article.category
  );
  const samePlatform = getAllArticles().filter(
    (a) =>
      a.slug !== article.slug &&
      a.platforms.some((p) => article.platforms.includes(p))
  );
  const merged = [...sameTags, ...sameCategory, ...samePlatform, ...getAllArticles()].filter(
    (a) => a.slug !== article.slug
  );
  const unique = Array.from(new Map(merged.map((a) => [a.slug, a])).values());
  return unique.slice(0, limit);
}

export const CATEGORY_NAV: { key: Category; label: string }[] = [
  { key: "breaking", label: "Breaking" },
  { key: "news", label: "News" },
  { key: "leaks", label: "Leaks" },
  { key: "reviews", label: "Reviews" },
];

export const PLATFORM_NAV: { key: Platform; label: string }[] = [
  { key: "pc", label: "PC" },
  { key: "playstation", label: "PlayStation" },
  { key: "xbox", label: "Xbox" },
  { key: "nintendo", label: "Nintendo" },
];
