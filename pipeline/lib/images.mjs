import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Bildbeschaffung (Betreiber-Entscheidung vom 04.08.2026):
//   1. Bild aus dem RSS-Feed-Eintrag (enclosure / media:content)
//   2. og:image der Quellseite als Fallback
//   3. Kein Bild → Frontend rendert PlaceholderArt
// Jedes übernommene Bild erhält einen Bildnachweis (credit) mit Quellenname
// und die Quell-URL; die Quelle ist zusätzlich im Artikel verlinkt.
// Alle Bilder werden auf 1600×900 (16:9, cover) zugeschnitten und als WebP
// gespeichert; next/image übernimmt Responsive-Varianten zur Laufzeit.

const UA =
  "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com; Gaming-News-Aggregation)";
const MIN_SOURCE_WIDTH = 640;
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;

// Viele Feeds (v. a. WordPress-basierte Quellen wie GameSpot) liefern im
// media:content/enclosure nur eine kleine Vorschau über einen Resize-
// Query-Parameter (z. B. "?w=300"), obwohl die CDN-URL das Originalbild in
// voller Auflösung ausliefert, sobald der Parameter fehlt. Wir entfernen
// bekannte Resize-Parameter, bevor wir das Bild herunterladen, statt ein
// brauchbares Bild allein wegen der Vorschaugrösse zu verwerfen.
function ohneGroessenParameter(url) {
  try {
    const u = new URL(url);
    for (const p of ["w", "h", "width", "height", "resize", "fit", "crop", "quality"]) {
      u.searchParams.delete(p);
    }
    return u.toString();
  } catch {
    return url;
  }
}

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

async function optimizeAndSave(buffer, slug, publicDir) {
  const meta = await sharp(buffer).metadata();
  if ((meta.width ?? 0) < MIN_SOURCE_WIDTH) {
    throw new Error(`Bild zu klein (${meta.width}px, min. ${MIN_SOURCE_WIDTH}px)`);
  }
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
// items: alle Quellen des Clusters (nicht nur die primäre) — bei mehreren
// Quellen erhöht das die Trefferchance deutlich, z. B. wenn die primäre
// Quelle kein brauchbares Bild liefert, eine weitere aber schon.
export async function acquireImage({ slug, items, altText, publicDir }) {
  const candidates = [];
  for (const it of items) {
    if (it.image) {
      candidates.push({ url: it.image, feedName: it.feedName, link: it.link, label: `${it.feedName}: Feed-Bild` });
      const upsized = ohneGroessenParameter(it.image);
      if (upsized !== it.image) {
        candidates.push({ url: upsized, feedName: it.feedName, link: it.link, label: `${it.feedName}: Feed-Bild (Originalgrösse)` });
      }
    }
    if (it.ogImage) {
      candidates.push({ url: it.ogImage, feedName: it.feedName, link: it.link, label: `${it.feedName}: og:image` });
    }
  }

  for (const candidate of candidates) {
    try {
      const buf = await download(candidate.url);
      const src = await optimizeAndSave(buf, slug, publicDir);
      return {
        src,
        alt: altText,
        credit: `Bild: ${candidate.feedName}`,
        sourceUrl: candidate.link,
      };
    } catch (err) {
      console.log(`  Bild: ${candidate.label} unbrauchbar (${err.message})`);
    }
  }

  return null;
}
