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
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}`,
        text: "",
        ogImage: null,
        embed: null,
        embeds: { youtube: null, twitter: null, reddit: null },
      };
    }
    const html = await res.text();

    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
      null;

    // Beiwerk (Navigation, Kopf, Fuss, Seitenspalten) einmal entfernen — der
    // Rest ist der eigentliche Artikelbereich. Diente bisher nur der
    // Textgewinnung; seit dem 11.08.2026 auch der Embed-Suche, siehe unten.
    const rumpf = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

    // Eingebetteter Tweet/Reddit-Post/YouTube-Trailer in der Quelle — wird bei
    // der Artikelgenerierung als klick-zu-laden-Embed übernommen (siehe
    // ExternalEmbed.tsx), statt das Bild nur zu beschreiben.
    //
    // ALLE Kandidaten zurückgeben statt einen vorab zu küren (11.08.2026):
    // Früher entschied hier eine feste Rangfolge (X vor Reddit vor YouTube).
    // Weil auf Nachrichtenseiten fast immer irgendein X-Link steht — und sei
    // es ein Teilen-Knopf —, gewann X praktisch immer und verdrängte den
    // Trailer selbst dort, wo die Meldung vom Trailer handelte. Die Auswahl
    // trifft jetzt run.mjs, wo der Artikelgegenstand bekannt ist.
    const tweetUrl = html.match(
      /https?:\/\/(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+/
    )?.[0];
    const redditUrl = html.match(
      /https?:\/\/(?:www\.)?reddit\.com\/r\/[A-Za-z0-9_]+\/comments\/[a-z0-9]+\/[^"'\s<>]*/
    )?.[0];
    // Echte Player zuerst: <iframe> (auch lazy per data-src) und das
    // embedUrl-Feld aus JSON-LD/VideoObject — viele Quellseiten laden YouTube
    // erst beim Scrollen, das Iframe-src allein verpasste deren Trailer
    // (08.08.2026).
    const youtubeId =
      html.match(
        /<iframe[^>]+(?:src|data-src)=["']https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/i
      )?.[1] ??
      html.match(
        /"embedUrl"\s*:\s*"https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/i
      )?.[1] ??
      // Sonst ein VERLINKTES Video — aber nur im Artikelrumpf, nie in
      // Navigation/Fuss/Seitenspalte. Genau das war der alte Einwand gegen
      // Fliesstext-Links (Empfehlungs- und Footer-Links landeten als Embed);
      // durch die Rumpf-Beschränkung greift er nicht mehr. Kanal- und
      // Playlist-Adressen matchen ohnehin nicht, nur 11-stellige Video-IDs.
      rumpf.match(
        /https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?(?:[^"'\s<>]*&)?v=|shorts\/)([A-Za-z0-9_-]{11})/i
      )?.[1] ??
      rumpf.match(/https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/i)?.[1];

    const embeds = {
      youtube: youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null,
      twitter: tweetUrl ?? null,
      reddit: redditUrl ?? null,
    };
    // Alte Vorauswahl bleibt als Rückfallebene erhalten, falls ein Aufrufer
    // noch `embed` liest.
    const embed = tweetUrl
      ? { platform: "twitter", url: tweetUrl }
      : redditUrl
        ? { platform: "reddit", url: redditUrl }
        : embeds.youtube
          ? { platform: "youtube", url: embeds.youtube }
          : null;

    const text = rumpf
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

    return { ok: true, text, ogImage, embed, embeds };
  } catch (err) {
    return {
      ok: false,
      error: String(err?.message ?? err),
      text: "",
      ogImage: null,
      embed: null,
      embeds: { youtube: null, twitter: null, reddit: null },
    };
  }
}
