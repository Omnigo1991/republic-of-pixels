import { getAllArticles } from "@/lib/articles";

// Google-News-Sitemap (für Google Discover / Google News): listet nur
// Artikel der letzten 48 Stunden — so verlangt es die Spezifikation.
// Wird bei jedem Build neu erzeugt; da die Pipeline alle 3 Stunden
// deployt, ist die Liste immer aktuell. Ältere Artikel bleiben über die
// normale sitemap.xml auffindbar.
export const dynamic = "force-static";

const SITE_URL = "https://www.republicofpixels.com";
const ZWEI_TAGE_MS = 48 * 60 * 60 * 1000;

function xmlEscape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET() {
  const cutoff = Date.now() - ZWEI_TAGE_MS;
  const recent = getAllArticles().filter(
    (a) => new Date(a.publishedAt).getTime() >= cutoff
  );

  const urls = recent
    .map(
      (a) => `  <url>
    <loc>${SITE_URL}/artikel/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Republic of Pixels</news:name>
        <news:language>de</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt}</news:publication_date>
      <news:title>${xmlEscape(a.title)}</news:title>
    </news:news>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
