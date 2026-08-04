import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Bildbeschaffung mit klarer Rechte-Priorität (docs/audit-2026-08.md §4):
//   1. Offizielles Steam-Key-Art des Spiels (Promo-Material des Publishers)
//   2. Bild aus Feed/Quelle — nur wenn die Quelle es erlaubt (useFeedImage)
//   3. Kein Bild → Frontend rendert PlaceholderArt
// Alle Bilder werden auf 1600×900 (16:9, cover) zugeschnitten und als WebP
// gespeichert; next/image übernimmt Responsive-Varianten zur Laufzeit.

const UA =
  "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com; Gaming-News-Aggregation)";
const MIN_SOURCE_WIDTH = 800;
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;

async function download(url, timeoutMs = 20000) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_DOWNLOAD_BYTES) throw new Error("Bild zu gross");
  return buf;
}

// Sucht das Spiel im Steam-Store und liefert grosse offizielle Artworks.
export async function findSteamArt(gameName) {
  if (!gameName) return null;
  try {
    const q = encodeURIComponent(gameName);
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${q}&cc=de&l=german`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.items?.[0];
    if (!hit?.id) return null;
    // library_hero (3840×1240) ist das grösste Promo-Asset; header als Fallback.
    const candidates = [
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${hit.id}/library_hero.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${hit.id}/capsule_616x353.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${hit.id}/header.jpg`,
    ];
    for (const url of candidates) {
      try {
        const buf = await download(url);
        const meta = await sharp(buf).metadata();
        if ((meta.width ?? 0) >= 600) return { buffer: buf, url, appName: hit.name };
      } catch {
        // nächsten Kandidaten versuchen
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function optimizeAndSave(buffer, slug, publicDir) {
  const meta = await sharp(buffer).metadata();
  if ((meta.width ?? 0) < 600) throw new Error(`Bild zu klein (${meta.width}px)`);
  const dir = join(publicDir, "images", "articles");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${slug}.webp`);
  await sharp(buffer)
    .resize(1600, 900, { fit: "cover", position: "attention" })
    .webp({ quality: 80 })
    .toFile(file);
  return `/images/articles/${slug}.webp`;
}

// Hauptfunktion: liefert ein ArticleImage-Objekt oder null (→ Placeholder).
export async function acquireImage({ slug, gameName, feedItem, altText, publicDir }) {
  // 1. Offizielles Steam-Key-Art
  const steam = await findSteamArt(gameName);
  if (steam) {
    try {
      const src = await optimizeAndSave(steam.buffer, slug, publicDir);
      return {
        src,
        alt: altText,
        credit: `Bild: Offizielles Artwork (${steam.appName}) via Steam`,
        sourceUrl: steam.url,
      };
    } catch (err) {
      console.log(`  Bild: Steam-Art unbrauchbar (${err.message})`);
    }
  }

  // 2. Feed-Bild, sofern die Quelle es zulässt
  if (feedItem?.useFeedImage && feedItem?.image) {
    try {
      const buf = await download(feedItem.image);
      const meta = await sharp(buf).metadata();
      if ((meta.width ?? 0) >= MIN_SOURCE_WIDTH) {
        const src = await optimizeAndSave(buf, slug, publicDir);
        return {
          src,
          alt: altText,
          credit: `Bild: ${feedItem.feedName}`,
          sourceUrl: feedItem.link,
        };
      }
    } catch (err) {
      console.log(`  Bild: Feed-Bild unbrauchbar (${err.message})`);
    }
  }

  // 3. Kein Bild — Frontend zeigt PlaceholderArt
  return null;
}
