import { getAllArticles } from "@/lib/articles";

export const dynamic = "force-static";

const SITE_URL = "https://www.republicofpixels.com";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Eigener RSS-Feed — Pflicht für ein News-Medium (Feedreader, Syndication,
// Google-News-Erschliessung). Wird bei jedem Build statisch erzeugt.
export function GET() {
  const items = getAllArticles()
    .slice(0, 30)
    .map((a) => {
      const url = `${SITE_URL}/artikel/${a.slug}`;
      const img = a.image?.src
        ? `\n      <enclosure url="${SITE_URL}${a.image.src}" type="image/webp" length="0"/>`
        : "";
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(a.excerpt)}</description>
      <category>${escapeXml(a.category)}</category>${img}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Republic of Pixels — Gaming-News, Leaks &amp; Reviews</title>
    <link>${SITE_URL}</link>
    <description>Deutschsprachige Gaming-News für PC, PlayStation, Xbox und Nintendo — ohne Clickbait.</description>
    <language>de-DE</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
