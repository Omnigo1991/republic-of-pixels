import type { MetadataRoute } from "next";
import { getAllArticles, CATEGORY_NAV, PLATFORM_NAV } from "@/lib/articles";

const SITE_URL = "https://www.republicofpixels.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/impressum`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/datenschutz`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const categoryPages: MetadataRoute.Sitemap = [...CATEGORY_NAV, ...PLATFORM_NAV].map((c) => ({
    url: `${SITE_URL}/kategorie/${c.key}`,
    changeFrequency: "hourly" as const,
    priority: 0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = getAllArticles().map((a) => ({
    url: `${SITE_URL}/artikel/${a.slug}`,
    lastModified: a.publishedAt,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...articlePages];
}
