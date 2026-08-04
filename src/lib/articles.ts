import type { Article, Category, Platform } from "./types";

import xboxRestructuring from "@/content/articles/xbox-restructuring-2026.json";
import gta6 from "@/content/articles/gta-6-august-trailer-geruechte.json";
import silentHill from "@/content/articles/silent-hill-townfall-release.json";
import mina from "@/content/articles/mina-the-hollower-review.json";
import halo from "@/content/articles/halo-campaign-evolved-review.json";
import gpu from "@/content/articles/gpu-preiserhoehungen-august-2026.json";
import eldenRing from "@/content/articles/elden-ring-tarnished-edition.json";
import psPlus from "@/content/articles/ps-plus-essential-august-2026.json";
import gamePass from "@/content/articles/xbox-game-pass-august-2026.json";
import switch2 from "@/content/articles/switch-2-august-2026-ports.json";
import indie from "@/content/articles/indie-games-boom-2026.json";

// Alle Artikel werden hier explizit importiert (statt per fs-Scan), damit Next.js
// sie zur Build-Zeit statisch bündeln und typisieren kann. Neue Artikel: JSON-Datei
// unter src/content/articles/ ablegen und hier ergänzen.
const ALL_ARTICLES = [
  xboxRestructuring,
  gta6,
  silentHill,
  mina,
  halo,
  gpu,
  eldenRing,
  psPlus,
  gamePass,
  switch2,
  indie,
] as unknown as Article[];

export function getAllArticles(): Article[] {
  return [...ALL_ARTICLES].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getArticleBySlug(slug: string): Article | undefined {
  return ALL_ARTICLES.find((a) => a.slug === slug);
}

export function getTopStory(): Article {
  const flagged = ALL_ARTICLES.find((a) => a.isTopStory);
  return flagged ?? getAllArticles()[0];
}

export function getPopularArticles(limit = 5): Article[] {
  const ranked = ALL_ARTICLES.filter((a) => a.popularityRank !== null).sort(
    (a, b) => (a.popularityRank as number) - (b.popularityRank as number)
  );
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
