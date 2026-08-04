import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
});

const UA =
  "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com; Gaming-News-Aggregation)";

function asArray(x) {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function textOf(node) {
  if (node === undefined || node === null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in node) return String(node["#text"]);
  return "";
}

function stripHtml(html) {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extrahiert eine Bild-URL aus RSS-Item-Varianten (enclosure, media:content, media:thumbnail).
function imageOf(item) {
  const enclosure = asArray(item.enclosure).find((e) =>
    String(e?.["@type"] ?? "").startsWith("image/")
  );
  if (enclosure?.["@url"]) return enclosure["@url"];
  const media = asArray(item["media:content"]).find(
    (m) => m?.["@url"] && (m["@medium"] === "image" || String(m["@type"] ?? "").startsWith("image/"))
  );
  if (media?.["@url"]) return media["@url"];
  const thumb = asArray(item["media:thumbnail"])[0];
  if (thumb?.["@url"]) return thumb["@url"];
  return null;
}

// Ruft einen Feed ab und normalisiert RSS-2.0- wie Atom-Einträge.
// Wirft nie — ein toter Feed darf den Lauf nicht stoppen.
export async function fetchFeed(feed, { timeoutMs = 15000 } = {}) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!res.ok) return { feed, ok: false, error: `HTTP ${res.status}`, items: [] };
    const xml = await res.text();
    const doc = parser.parse(xml);

    const rssItems = asArray(doc?.rss?.channel?.item);
    const atomEntries = asArray(doc?.feed?.entry);

    const items = [
      ...rssItems.map((it) => ({
        feedId: feed.id,
        feedName: feed.name,
        lang: feed.lang,
        weight: feed.weight,
        useFeedImage: feed.useFeedImage,
        guid: textOf(it.guid) || textOf(it.link),
        title: stripHtml(textOf(it.title)),
        link: textOf(it.link),
        publishedAt: it.pubDate ? new Date(textOf(it.pubDate)) : null,
        summary: stripHtml(textOf(it.description)).slice(0, 500),
        image: imageOf(it),
      })),
      ...atomEntries.map((it) => {
        const link =
          asArray(it.link).find((l) => l?.["@rel"] !== "self")?.["@href"] ??
          textOf(it.link);
        return {
          feedId: feed.id,
          feedName: feed.name,
          lang: feed.lang,
          weight: feed.weight,
          useFeedImage: feed.useFeedImage,
          guid: textOf(it.id) || link,
          title: stripHtml(textOf(it.title)),
          link,
          publishedAt: it.updated || it.published ? new Date(textOf(it.updated ?? it.published)) : null,
          summary: stripHtml(textOf(it.summary ?? it.content)).slice(0, 500),
          image: imageOf(it),
        };
      }),
    ].filter((it) => it.title && it.link);

    return { feed, ok: true, items };
  } catch (err) {
    return { feed, ok: false, error: String(err?.message ?? err), items: [] };
  }
}

export async function fetchAllFeeds(feeds) {
  const results = await Promise.all(feeds.map((f) => fetchFeed(f)));
  for (const r of results) {
    const status = r.ok ? `${r.items.length} Einträge` : `FEHLER: ${r.error}`;
    console.log(`  Feed ${r.feed.id}: ${status}`);
  }
  return results;
}
