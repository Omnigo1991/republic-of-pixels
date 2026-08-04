// Lädt eine Quellseite und reduziert sie auf lesbaren Text als Faktenbasis
// für die Artikelgenerierung. Bewusst einfach gehalten: Scripts/Styles/Nav
// entfernen, Tags strippen, auf Zeichenlimit kappen.
const UA =
  "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com; Gaming-News-Aggregation)";

export async function extractArticleText(url, { maxChars = 9000, timeoutMs = 20000 } = {}) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, text: "", ogImage: null };
    const html = await res.text();

    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
      null;

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);

    return { ok: true, text, ogImage };
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err), text: "", ogImage: null };
  }
}
