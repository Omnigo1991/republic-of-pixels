import type { Article } from "./types";
import { getAllArticles } from "./articles";

// Themen-Hubs (SEO-Baustein, Tim-Freigabe 08.08.2026): Aus den Artikel-Tags
// werden automatisch Landeseiten pro Spiel/Thema (/thema/gta-6 …) erzeugt.
// Ziel: Rankings für Spielnamen-Suchen ("GTA 6 News") und topische Autorität
// durch gebündelte interne Verlinkung. Nur Themen mit genügend Substanz
// bekommen eine Seite — Thin-Content-Seiten schaden bei Google mehr, als
// sie nützen.

export interface Thema {
  slug: string;
  label: string;
  articles: Article[];
}

const MIN_ARTIKEL = 3;

// Offensichtliche Tag-Duplikate zusammenführen (Ziel-Tag in Kleinschreibung).
// Bewusst kurz gehalten und nur für belegte Fälle — die Pipeline vergibt
// Tags frei, hier wird nur vereinheitlicht, was nachweislich doppelt läuft.
const ALIAS: Record<string, string> = {
  "nintendo switch 2": "switch 2",
  "playstation 5": "ps5",
  "grand theft auto 6": "gta 6",
};

export function themaSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let cache: Map<string, Thema> | null = null;

function buildThemen(): Map<string, Thema> {
  if (cache) return cache;
  // Sammeln: pro normalisiertem Tag alle Artikel und die häufigste
  // Original-Schreibweise als Anzeige-Label.
  const buckets = new Map<
    string,
    { labels: Map<string, number>; articles: Article[] }
  >();
  for (const article of getAllArticles()) {
    const seen = new Set<string>();
    for (const rawTag of article.tags ?? []) {
      const key = ALIAS[rawTag.toLowerCase()] ?? rawTag.toLowerCase();
      const slug = themaSlug(key);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const bucket = buckets.get(slug) ?? { labels: new Map(), articles: [] };
      bucket.labels.set(rawTag, (bucket.labels.get(rawTag) ?? 0) + 1);
      bucket.articles.push(article);
      buckets.set(slug, bucket);
    }
  }

  cache = new Map();
  for (const [slug, bucket] of buckets) {
    if (bucket.articles.length < MIN_ARTIKEL) continue;
    const label = [...bucket.labels.entries()].sort((a, b) => b[1] - a[1])[0][0];
    cache.set(slug, {
      slug,
      label,
      // getAllArticles liefert bereits neueste zuerst — Reihenfolge erhalten.
      articles: bucket.articles,
    });
  }
  return cache;
}

export function getAlleThemen(): Thema[] {
  return [...buildThemen().values()].sort(
    (a, b) => b.articles.length - a.articles.length
  );
}

export function getThema(slug: string): Thema | undefined {
  return buildThemen().get(slug);
}

// Für die Themen-Zeile auf Artikelseiten: nur Tags, die einen Hub haben.
export function themenFuerArtikel(article: Article): Thema[] {
  const themen = buildThemen();
  const out: Thema[] = [];
  const seen = new Set<string>();
  for (const rawTag of article.tags ?? []) {
    const key = ALIAS[rawTag.toLowerCase()] ?? rawTag.toLowerCase();
    const slug = themaSlug(key);
    const thema = themen.get(slug);
    if (thema && !seen.has(slug)) {
      seen.add(slug);
      out.push(thema);
    }
  }
  return out;
}
