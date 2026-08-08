import { writeFile } from "node:fs/promises";
import sharp from "sharp";

// Offizielles Bildmaterial für Social-Posts (Tim-Strategie 08.08.2026,
// verfeinert nach GamePro-Vorbild): Pro Spiel existiert ein POOL aus
// offiziellem Publisher-Material — Steam-Bibliothekscover (1200×1800,
// Hochformat) plus die offiziellen Store-Screenshots (1920×1080). Bei
// wiederkehrenden News zum selben Spiel wird rotiert (Index kommt vom
// Aufrufer aus dem State), damit nie zweimal hintereinander dasselbe
// Bild auf dem Profil landet. Kein Treffer → null, dann greift das
// Pressebild der Quelle (mit Qualitäts-Wächter).

const UA = "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com)";

function normalisiert(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function laden(url, timeoutMs = 20000) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

// Liefert das Pool-Bild mit der gegebenen Rotations-Nummer (wird intern
// modulo Poolgrösse gerechnet) oder null.
export async function holeSpielBild({ gameName, rotation = 0, outPath }) {
  try {
    const suche = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=german&cc=DE`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) }
    ).then((r) => r.json());

    const wunsch = normalisiert(gameName);
    const treffer = (suche.items ?? []).find((it) => {
      const n = normalisiert(it.name);
      // Strenger Abgleich: exakt oder klare Teilmenge — sonst landet das
      // Material des falschen Spiels auf dem Post.
      return n === wunsch || n.startsWith(wunsch) || wunsch.startsWith(n);
    });
    if (!treffer) return null;

    // Details: Screenshots + Publisher (ein Aufruf für beides).
    let screenshots = [];
    let publisher = "Steam";
    try {
      const details = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${treffer.id}&l=german`,
        { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) }
      ).then((r) => r.json());
      const data = details?.[treffer.id]?.data;
      publisher = data?.publishers?.[0] ?? "Steam";
      screenshots = (data?.screenshots ?? []).map((s) => s.path_full).filter(Boolean);
    } catch {
      // Ohne Details bleibt der Pool bei der Key Art
    }

    // Pool: Key Art zuerst, dann bis zu 8 offizielle Screenshots.
    const pool = [
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${treffer.id}/library_600x900_2x.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${treffer.id}/library_600x900.jpg`,
      ...screenshots.slice(0, 8),
    ];
    // Die beiden Key-Art-Auflösungen zählen als EIN Pool-Eintrag:
    const eintraege = [[pool[0], pool[1]], ...pool.slice(2).map((u) => [u])];
    const wahl = eintraege[rotation % eintraege.length];

    let buffer = null;
    for (const url of wahl) {
      buffer = await laden(url);
      if (buffer && buffer.length >= 20000) break;
      buffer = null;
    }
    // Gewählter Eintrag nicht ladbar → Key Art als Rettung.
    if (!buffer) {
      for (const url of [pool[0], pool[1]]) {
        buffer = await laden(url);
        if (buffer && buffer.length >= 20000) break;
        buffer = null;
      }
    }
    if (!buffer) return null;
    const meta = await sharp(buffer).metadata();
    if ((meta.height ?? 0) < 900) return null;
    await writeFile(outPath, buffer);

    return {
      pfad: outPath,
      credit: `Bild: ${publisher}`,
      poolGroesse: eintraege.length,
      spielKey: normalisiert(treffer.name),
    };
  } catch (err) {
    // Sichtbar loggen statt still schlucken (Lehre vom 08.08.: stumme
    // Fehler kosten Diagnose-Zeit) — der Aufrufer behandelt null ohnehin.
    console.log(`  Spielbild-Suche fehlgeschlagen (${err.message})`);
    return null;
  }
}
