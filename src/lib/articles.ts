import type { Article, Category, Platform } from "./types";
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
  // Eine manuell markierte Top-Story gilt maximal 48 h — danach übernimmt
  // automatisch der neueste Artikel, damit die Startseite nie veraltet wirkt.
  const flagged = ALL_ARTICLES.find(
    (a) =>
      a.isTopStory &&
      Date.now() - new Date(a.publishedAt).getTime() < TOP_STORY_MAX_AGE_MS
  );
  return flagged ?? getAllArticles()[0];
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
  const sameCategory = getAllArticles().filter(
    (a) => a.slug !== article.slug && a.category === article.category
  );
  const samePlatform = getAllArticles().filter(
    (a) =>
      a.slug !== article.slug &&
      a.platforms.some((p) => article.platforms.includes(p))
  );
  const merged = [...sameCategory, ...samePlatform, ...getAllArticles()].filter(
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
