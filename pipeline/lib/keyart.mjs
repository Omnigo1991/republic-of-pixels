import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Offizielles Bildmaterial für Social-Posts (Tim-Strategie 08.08.2026,
// erweitert 09.08.2026 um IGDB): Pro Spiel existiert ein POOL aus
// offiziellem Publisher-Material. Quellen in dieser Reihenfolge:
//   1. Steam  - Bibliothekscover (1200×1800) + Store-Screenshots
//   2. IGDB   - Cover + Artworks + Screenshots (deckt Konsolen-Exklusives
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
    // keine Datei - IGDB-Stufe wird einfach übersprungen
  }
}

function normalisiert(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokens(s) {
  return String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Namens-Abgleich auf GANZWORT-Basis mit Rangfolge (09.08.2026 abends
// erweitert): Vorher musste der kürzere Name der ANFANG des längeren sein -
// damit fiel "Oblivion Remastered" gegen "The Elder Scrolls IV: Oblivion
// Remastered" durch, obwohl das Artwork vorhanden war, und die Story landete
// unnötig auf einer Typo-Karte. Jetzt zählt auch eine zusammenhängende
// Wortfolge irgendwo im Titel - aber schlechter bewertet, damit bei mehreren
// Kandidaten der genauere gewinnt.
// Rang 0 = identisch, 1 = Anfang, 2 = enthaltene Wortfolge, null = kein Treffer.
// Weiterhin sicher: "grand theft auto vi" trifft NICHT auf "… vice city",
// weil "vi" und "vice" verschiedene Wörter sind.
function trefferRang(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return null;
  const kurz = ta.length <= tb.length ? ta : tb;
  const lang = kurz === ta ? tb : ta;
  if (ta.length === tb.length && ta.every((t, i) => t === tb[i])) return 0;
  if (kurz.every((t, i) => t === lang[i])) return 1;
  for (let start = 1; start + kurz.length <= lang.length; start++) {
    if (kurz.every((t, i) => t === lang[start + i])) return 2;
  }
  return null;
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

  // Bester Treffer nach Rang; bei Gleichstand gewinnt Steams eigene
  // Relevanz-Reihenfolge (verhindert, dass etwa "Turok 3: Shadow of
  // Oblivion Remastered" das gesuchte Oblivion verdrängt).
  const treffer = (suche.items ?? [])
    .map((it, i) => ({ it, rang: trefferRang(gameName, it.name), i }))
    .filter((k) => k.rang !== null)
    .sort((a, b) => a.rang - b.rang || a.i - b.i)[0]?.it;
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

  // Kandidaten: Ganzwort-Treffer, dann ranken - exakter Name schlägt
  // alles, Hauptspiel (category 0) schlägt Bundles/DLC/Mods, mehr
  // Artwork schlägt weniger (Fan-Einträge wie "BotW Randomizer" von
  // Drittpersonen fallen so zuverlässig durch).
  const kandidaten = (Array.isArray(spiele) ? spiele : []).filter((s) => trefferRang(gameName, s.name) !== null);
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
  // Screenshots - jeweils 1080p mit 720p-Rettung im selben Eintrag.
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
      console.log(`  Steam-Suche fehlgeschlagen (${err.message}) - versuche IGDB`);
    }
    if (!pool) pool = await igdbPool(gameName);
    if (!pool) return null;

    const { eintraege, publisher, spielKey } = pool;

    // Ab der Rotations-Position ALLE Pool-Einträge durchgehen, bis einer
    // lädt und den Qualitäts-Wächter besteht (Fix 09.08.2026 abends):
    // Vorher wurde bei einem Fehlschlag nur das Cover als Rettung probiert
    // - hat ein Spiel wie "Oblivion Remastered" gar kein Steam-Cover (404),
    // blieben die sechs vorhandenen Screenshots ungenutzt und die Story
    // landete unnötig auf einer Typo-Karte.
    let buffer = null;
    for (let n = 0; n < eintraege.length && !buffer; n++) {
      const eintrag = eintraege[(rotation + n) % eintraege.length];
      for (const url of eintrag) {
        const kandidat = await laden(url);
        if (!kandidat || kandidat.length < 20000) continue;
        const meta = await sharp(kandidat).metadata();
        if ((meta.height ?? 0) < 900) continue;
        buffer = kandidat;
        break;
      }
    }
    if (!buffer) return null;
    await writeFile(outPath, buffer);

    return {
      pfad: outPath,
      credit: `Bild: ${publisher}`,
      poolGroesse: eintraege.length,
      spielKey,
    };
  } catch (err) {
    // Sichtbar loggen statt still schlucken (Lehre vom 08.08.: stumme
    // Fehler kosten Diagnose-Zeit) - der Aufrufer behandelt null ohnehin.
    console.log(`  Spielbild-Suche fehlgeschlagen (${err.message})`);
    return null;
  }
}

// MEHRERE KANDIDATEN STATT EINEM (Tim, 14.08.2026 - fürs Bild-Tor).
//
// holeSpielBild oben nimmt das ERSTE Bild, das lädt und über 900 px hoch
// ist, und liefert es aus. Ob es das beste im Pool ist, hat nie jemand
// verglichen - es gab nichts zum Vergleichen. Genau daran sind Tomb Raider
// (Lara am Bildrand) und AC Black Flag (beide Figuren kaum sichtbar)
// gescheitert: Der Pool enthielt bessere Bilder, wir haben sie nie geholt.
//
// Diese Fassung lädt bis zu `anzahl` Pool-Einträge herunter, damit das
// Bild-Tor sie am fertigen Ausschnitt gegeneinander stellen kann. Die
// Rotation bleibt erhalten (kein Motiv doppelt innerhalb einer Woche).
export async function holeSpielBildKandidaten({
  gameName,
  rotation = 0,
  anzahl = 3,
  outPrefix,
}) {
  try {
    let pool = null;
    try {
      pool = await steamPool(gameName);
    } catch (err) {
      console.log(`  Steam-Suche fehlgeschlagen (${err.message}) - versuche IGDB`);
    }
    if (!pool) pool = await igdbPool(gameName);
    if (!pool) return null;

    const { eintraege, publisher, spielKey } = pool;
    const kandidaten = [];

    for (let n = 0; n < eintraege.length && kandidaten.length < anzahl; n++) {
      const index = (rotation + n) % eintraege.length;
      for (const url of eintraege[index]) {
        const roh = await laden(url);
        if (!roh || roh.length < 20000) continue;
        const meta = await sharp(roh).metadata();
        if ((meta.height ?? 0) < 900) continue;
        const pfad = `${outPrefix}-${index}.jpg`;
        await writeFile(pfad, roh);
        const verhaeltnis = (meta.width ?? 1) / (meta.height ?? 1);
        kandidaten.push({
          pfad,
          credit: `Bild: ${publisher}`,
          herkunft: index === 0 ? "offizielles Key Art" : `offizieller Screenshot ${index}`,
          poolIndex: index,
          verhaeltnis,
          // Alles, was nicht deutlich breiter als hoch ist, überlebt den
          // Schnitt auf 4:5 fast unbeschadet.
          hochformat: verhaeltnis <= 1.05,
        });
        break;
      }
    }

    if (kandidaten.length === 0) return null;

    // HOCHFORMAT ZUERST (Tim, 23.08.2026). Ein 16:9-Bild verliert beim
    // Schnitt auf 4:5 über die Hälfte seiner Breite, und senkrecht bleibt
    // kein Spielraum: Die Höhe passt exakt, es lässt sich nichts
    // verschieben. Was im Bild unten liegt, liegt zwangsläufig hinter dem
    // Textblock. Hochformatige Vorlagen haben dieses Problem nicht, darum
    // gehen sie dem Bild-Tor zuerst unter die Augen. Die Reihenfolge
    // innerhalb der beiden Gruppen bleibt die Rotationsreihenfolge - sonst
    // käme wieder bei jedem Post dasselbe Bild.
    kandidaten.sort((a, b) => Number(b.hochformat) - Number(a.hochformat));
    const hoch = kandidaten.filter((k) => k.hochformat).length;
    console.log(
      `  Spielbilder: ${kandidaten.length} Kandidaten, davon ${hoch} im Hochformat`,
    );

    return { kandidaten, poolGroesse: eintraege.length, spielKey, publisher };
  } catch (err) {
    console.log(`  Spielbild-Suche fehlgeschlagen (${err.message})`);
    return null;
  }
}
