import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Offizielles Bildmaterial für Social-Posts (Tim-Strategie 08.08.2026,
// erweitert 09.08.2026 um IGDB): Pro Spiel existiert ein POOL aus
// offiziellem Publisher-Material. Quellen in dieser Reihenfolge:
//   1. Steam  — Bibliothekscover (1200×1800) + Store-Screenshots
//   2. IGDB   — Cover + Artworks + Screenshots (deckt Konsolen-Exklusives
//               wie Nintendo/PlayStation ab, die Steam nicht kennt;
//               Zugang über Twitch-API-Schlüssel)
// Bei wiederkehrenden News zum selben Spiel wird rotiert (Index kommt vom
// Aufrufer aus dem State). Kein Treffer → null, dann greift das Pressebild
// der Quelle und zuletzt die Typo-Karte.

const UA = "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com)";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Lokale Entwicklung: Schlüssel aus .twitch.env (git-ignoriert) laden,
// falls die Umgebung sie nicht mitbringt (in CI kommen sie als Secrets).
if (!process.env.TWITCH_CLIENT_ID) {
  try {
    for (const zeile of readFileSync(join(ROOT, ".twitch.env"), "utf8").trim().split("\n")) {
      const [k, v] = zeile.split("=");
      if (k && v && !process.env[k]) process.env[k] = v;
    }
  } catch {
    // keine Datei — IGDB-Stufe wird einfach übersprungen
  }
}

function normalisiert(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokens(s) {
  return String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Namens-Abgleich auf GANZWORT-Basis: Der frühere Zeichen-startsWith liess
// "grand theft auto vi" auf "grand theft auto VICE city" passen und lieferte
// am 09.08.2026 Vice-City-Artwork für eine GTA-6-Anfrage. Jetzt gilt: Die
// kürzere Namensform muss Wort für Wort der Anfang der längeren sein
// (deckt Exakt-Treffer und Editions-Zusätze wie "… V Legacy" weiter ab).
function namensTreffer(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  const kurz = ta.length <= tb.length ? ta : tb;
  const lang = kurz === ta ? tb : ta;
  return kurz.length > 0 && kurz.every((t, i) => t === lang[i]);
}

function exaktGleich(a, b) {
  return tokens(a).join(" ") === tokens(b).join(" ");
}

async function laden(url, timeoutMs = 20000) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

// ---------- Quelle 1: Steam ----------

async function steamPool(gameName) {
  const suche = await fetch(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=german&cc=DE`,
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) }
  ).then((r) => r.json());

  // Strenger Abgleich: exakt oder Ganzwort-Präfix — sonst landet das
  // Material des falschen Spiels auf dem Post.
  const treffer = (suche.items ?? []).find((it) => namensTreffer(gameName, it.name));
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

  // Pool: Key Art zuerst (beide Auflösungen = EIN Eintrag), dann bis zu
  // 8 offizielle Screenshots.
  const eintraege = [
    [
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${treffer.id}/library_600x900_2x.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${treffer.id}/library_600x900.jpg`,
    ],
    ...screenshots.slice(0, 8).map((u) => [u]),
  ];
  return { eintraege, publisher, spielKey: normalisiert(treffer.name) };
}

// ---------- Quelle 2: IGDB (Twitch) ----------

let igdbToken = null;

async function igdbPool(gameName) {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;

  if (!igdbToken) {
    const auth = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`,
      { method: "POST", signal: AbortSignal.timeout(15000) }
    ).then((r) => r.json());
    igdbToken = auth.access_token ?? null;
    if (!igdbToken) return null;
  }

  const spiele = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": id,
      Authorization: `Bearer ${igdbToken}`,
      Accept: "application/json",
    },
    body: `search "${gameName.replaceAll('"', "")}"; fields name,category,cover.image_id,artworks.image_id,screenshots.image_id,involved_companies.company.name,involved_companies.publisher; limit 10;`,
    signal: AbortSignal.timeout(15000),
  }).then((r) => r.json());

  // Kandidaten: Ganzwort-Treffer, dann ranken — exakter Name schlägt
  // alles, Hauptspiel (category 0) schlägt Bundles/DLC/Mods, mehr
  // Artwork schlägt weniger (Fan-Einträge wie "BotW Randomizer" von
  // Drittpersonen fallen so zuverlässig durch).
  const kandidaten = (Array.isArray(spiele) ? spiele : []).filter((s) => namensTreffer(gameName, s.name));
  if (kandidaten.length === 0) return null;
  kandidaten.sort((a, b) => {
    const ea = exaktGleich(gameName, a.name) ? 0 : 1;
    const eb = exaktGleich(gameName, b.name) ? 0 : 1;
    if (ea !== eb) return ea - eb;
    const ca = a.category === 0 ? 0 : 1;
    const cb = b.category === 0 ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return ((b.artworks?.length ?? 0) + (b.screenshots?.length ?? 0)) - ((a.artworks?.length ?? 0) + (a.screenshots?.length ?? 0));
  });
  const spiel = kandidaten[0];

  const bild = (imageId, groesse) =>
    `https://images.igdb.com/igdb/image/upload/${groesse}/${imageId}.jpg`;
  const eintraege = [];
  // Cover zuerst (Hochformat wie Steam-Key-Art), dann Artworks, dann
  // Screenshots — jeweils 1080p mit 720p-Rettung im selben Eintrag.
  if (spiel.cover?.image_id) {
    eintraege.push([bild(spiel.cover.image_id, "t_1080p"), bild(spiel.cover.image_id, "t_720p")]);
  }
  for (const a of (spiel.artworks ?? []).slice(0, 5)) {
    eintraege.push([bild(a.image_id, "t_1080p"), bild(a.image_id, "t_720p")]);
  }
  for (const s of (spiel.screenshots ?? []).slice(0, 4)) {
    eintraege.push([bild(s.image_id, "t_1080p"), bild(s.image_id, "t_720p")]);
  }
  if (eintraege.length === 0) return null;

  const publisher =
    (spiel.involved_companies ?? []).find((c) => c.publisher && c.company?.name)?.company.name ?? "IGDB";
  return { eintraege, publisher, spielKey: normalisiert(spiel.name) };
}

// ---------- Gemeinsame Auswahl + Qualitäts-Wächter ----------

// Liefert das Pool-Bild mit der gegebenen Rotations-Nummer (wird intern
// modulo Poolgrösse gerechnet) oder null.
export async function holeSpielBild({ gameName, rotation = 0, outPath }) {
  try {
    let pool = null;
    try {
      pool = await steamPool(gameName);
    } catch (err) {
      console.log(`  Steam-Suche fehlgeschlagen (${err.message}) — versuche IGDB`);
    }
    if (!pool) pool = await igdbPool(gameName);
    if (!pool) return null;

    const { eintraege, publisher, spielKey } = pool;
    const wahl = eintraege[rotation % eintraege.length];

    let buffer = null;
    for (const url of wahl) {
      buffer = await laden(url);
      if (buffer && buffer.length >= 20000) break;
      buffer = null;
    }
    // Gewählter Eintrag nicht ladbar → erster Eintrag (Key Art/Cover) als Rettung.
    if (!buffer) {
      for (const url of eintraege[0]) {
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
      spielKey,
    };
  } catch (err) {
    // Sichtbar loggen statt still schlucken (Lehre vom 08.08.: stumme
    // Fehler kosten Diagnose-Zeit) — der Aufrufer behandelt null ohnehin.
    console.log(`  Spielbild-Suche fehlgeschlagen (${err.message})`);
    return null;
  }
}
