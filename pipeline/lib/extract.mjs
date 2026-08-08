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
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, text: "", ogImage: null, embed: null };
    const html = await res.text();

    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
      null;

    // Eingebetteter Tweet/Reddit-Post/YouTube-Trailer in der Quelle — wird bei
    // der Artikelgenerierung als klick-zu-laden-Embed übernommen (siehe
    // ExternalEmbed.tsx), statt das Bild nur zu beschreiben. Bei YouTube nur
    // echte <iframe>-Einbettungen matchen (nicht jeder Link im Fliesstext),
    // sonst landen unzusammenhängende Empfehlungs-/Footer-Links als Embed.
    const tweetUrl = html.match(
      /https?:\/\/(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+/
    )?.[0];
    const redditUrl = html.match(
      /https?:\/\/(?:www\.)?reddit\.com\/r\/[A-Za-z0-9_]+\/comments\/[a-z0-9]+\/[^"'\s<>]*/
    )?.[0];
    // Auch lazy-geladene Player erfassen (data-src) sowie das embedUrl-Feld
    // aus JSON-LD/VideoObject — viele Quellseiten laden YouTube erst beim
    // Scrollen, das Iframe-src allein verpasste deren Trailer (08.08.2026).
    const youtubeId =
      html.match(
        /<iframe[^>]+(?:src|data-src)=["']https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/i
      )?.[1] ??
      html.match(
        /"embedUrl"\s*:\s*"https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/i
      )?.[1];
    const embed = tweetUrl
      ? { platform: "twitter", url: tweetUrl }
      : redditUrl
        ? { platform: "reddit", url: redditUrl }
        : youtubeId
          ? { platform: "youtube", url: `https://www.youtube.com/watch?v=${youtubeId}` }
          : null;

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

    return { ok: true, text, ogImage, embed };
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err), text: "", ogImage: null, embed: null };
  }
}
