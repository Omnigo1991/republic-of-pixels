import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MAX_VERGROESSERUNG } from "./bildtor.mjs";

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
  // 12 offizielle Screenshots. Mehr Auswahl kostet nichts, solange wir nur
  // einen Teil davon herunterladen (siehe anzahl im Aufrufer).
  const eintraege = [
    {
      urls: [
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${treffer.id}/library_600x900_2x.jpg`,
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${treffer.id}/library_600x900.jpg`,
      ],
      herkunft: "Key Art (Steam)",
      publisher,
    },
    ...screenshots.slice(0, 12).map((u, i) => ({
      urls: [u],
      herkunft: `Screenshot ${i + 1} (Steam)`,
      publisher,
    })),
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
  // ORIGINALGROESSE ZUERST (Tim, 24.08.2026: "die am hochaufgeloestesten").
  //
  // Wir haben bisher t_1080p geholt - das deckelt JEDES Bild auf 1920 px
  // Breite, auch wenn IGDB das Original in 3840 px vorhaelt. Bei einem
  // Artwork, das im Post auf 4:5 beschnitten wird, ist genau diese Reserve
  // der Unterschied zwischen scharf und weich: Vom Original bleiben nach
  // dem Schnitt mehr echte Bildpunkte uebrig als vom 1080p-Abzug.
  //
  // Die Rettungsstufen bleiben dahinter stehen, in derselben Liste - laedt
  // das Original nicht, wird der Reihe nach abgestiegen statt der ganze
  // Eintrag zu verfallen.
  const stufen = (id) => [bild(id, "t_original"), bild(id, "t_1080p"), bild(id, "t_720p")];
  const publisher =
    (spiel.involved_companies ?? []).find((c) => c.publisher && c.company?.name)?.company.name ?? "IGDB";
  const eintraege = [];
  // Artworks zuerst: Das sind die offiziellen Presse-Motive, und genau die
  // liegen hier in Originalgroesse vor (bei Battlefield 6 gemessen
  // 3840x2160, waehrend Steam nur 1920x1080 liefert). Danach das Cover,
  // zuletzt die Screenshots.
  for (const a of (spiel.artworks ?? []).slice(0, 6)) {
    eintraege.push({ urls: stufen(a.image_id), herkunft: `Artwork ${eintraege.length + 1} (IGDB)`, publisher });
  }
  if (spiel.cover?.image_id) {
    eintraege.push({ urls: stufen(spiel.cover.image_id), herkunft: "Cover (IGDB)", publisher });
  }
  for (const [i, sc] of (spiel.screenshots ?? []).slice(0, 6).entries()) {
    eintraege.push({ urls: stufen(sc.image_id), herkunft: `Screenshot ${i + 1} (IGDB)`, publisher });
  }
  if (eintraege.length === 0) return null;
  return { eintraege, publisher, spielKey: normalisiert(spiel.name) };
}

// ---------- Beide Quellen zusammen ----------

// BEIDE QUELLEN STATT EINER (Tim, 24.08.2026: volle Konzentration auf
// Bildqualitaet).
//
// Bisher galt: Findet Steam das Spiel, wird IGDB nie gefragt. Das war eine
// Rangfolge ohne Beleg. Nachgemessen an vier Spielen (24.08.):
//
//   Battlefield 6     Steam 1920x1080   IGDB 3840x2160
//   Silksong          Steam 1920x1080   IGDB 2400x1350
//   Arc Raiders       Steam 1920x1080   IGDB  660x309
//   Baldur's Gate 3   Steam 1920x1080   IGDB  996x563
//
// Keine Quelle gewinnt immer. Steam ist verlaesslich, aber gedeckelt;
// IGDB hat die offiziellen Presse-Artworks - manchmal in 4K, manchmal
// winzig. Wer sich vorab fuer eine entscheidet, verliert in der Haelfte
// der Faelle. Also treten beide an, und es entscheidet die Messung: Die
// Kandidaten werden nach tatsaechlicher Aufloesung sortiert, zu kleine
// fallen schon beim Holen durch, und das Bild-Tor sieht den Rest.
//
// Die Listen werden ABWECHSELND zusammengelegt, nicht hintereinander -
// sonst waeren bei sechs Kandidaten alle sechs aus derselben Quelle.
async function beidePools(gameName) {
  const [steam, igdb] = await Promise.all([
    steamPool(gameName).catch((err) => {
      console.log(`  Steam-Suche fehlgeschlagen (${err.message})`);
      return null;
    }),
    igdbPool(gameName).catch((err) => {
      console.log(`  IGDB-Suche fehlgeschlagen (${err.message})`);
      return null;
    }),
  ]);
  if (!steam && !igdb) return null;
  if (!igdb) return steam;
  if (!steam) return igdb;

  const eintraege = [];
  for (let i = 0; i < Math.max(steam.eintraege.length, igdb.eintraege.length); i++) {
    if (igdb.eintraege[i]) eintraege.push(igdb.eintraege[i]);
    if (steam.eintraege[i]) eintraege.push(steam.eintraege[i]);
  }
  console.log(
    `  Bildquellen: Steam ${steam.eintraege.length} + IGDB ${igdb.eintraege.length} = ${eintraege.length} Eintraege`,
  );
  // Steams Titel ist der genauere Schluessel (Store-Name), darum zuerst.
  return { eintraege, publisher: steam.publisher, spielKey: steam.spielKey };
}

// ---------- Gemeinsame Auswahl + Qualitäts-Wächter ----------

// Liefert das Pool-Bild mit der gegebenen Rotations-Nummer (wird intern
// modulo Poolgrösse gerechnet) oder null.
export async function holeSpielBild({ gameName, rotation = 0, outPath }) {
  try {
    const pool = await beidePools(gameName);
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
      for (const url of eintrag.urls) {
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
    const pool = await beidePools(gameName);
    if (!pool) return null;

    const { eintraege, spielKey } = pool;
    const kandidaten = [];

    for (let n = 0; n < eintraege.length && kandidaten.length < anzahl; n++) {
      const index = (rotation + n) % eintraege.length;
      const eintrag = eintraege[index];
      for (const url of eintrag.urls) {
        const roh = await laden(url);
        if (!roh || roh.length < 20000) continue;
        const meta = await sharp(roh).metadata();
        if ((meta.height ?? 0) < 900) continue;
        // DIESELBE MESSLATTE WIE IM TOR, NUR FRUEHER (Tim, 24.08.2026).
        //
        // Die Hoehenregel allein reicht nicht: Ein Steam-Cover in 600x900
        // besteht sie und wird im 4:5-Fenster trotzdem 1.8x aufgeblasen -
        // das Tor verwirft es zuverlaessig, aber es hat bis dahin einen der
        // sechs Kandidatenplaetze belegt. Gemessen an vier echten Spielen
        // (24.08.): Silksong lieferte genau diesen Fall.
        //
        // Die Grenze kommt aus bildtor.mjs, damit es sie nur EINMAL gibt.
        const skala = Math.max(1080 / (meta.width ?? 1), 1350 / (meta.height ?? 1));
        const sichtbarB = Math.min(meta.width ?? 1, Math.round(1080 / skala));
        if (1080 / sichtbarB > MAX_VERGROESSERUNG) {
          console.log(
            `  Spielbild ${index} verworfen - ${meta.width}x${meta.height} muesste ${(1080 / sichtbarB).toFixed(2)}x hochgerechnet werden`,
          );
          continue;
        }
        const pfad = `${outPrefix}-${index}.jpg`;
        await writeFile(pfad, roh);
        const verhaeltnis = (meta.width ?? 1) / (meta.height ?? 1);
        kandidaten.push({
          pfad,
          credit: `Bild: ${eintrag.publisher}`,
          herkunft: eintrag.herkunft,
          poolIndex: index,
          spielKey,
          breite: meta.width ?? 0,
          hoehe: meta.height ?? 0,
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
    // Innerhalb der beiden Gruppen entscheidet ab jetzt die Aufloesung
    // (Tim, 24.08.2026). Vorher stand dort die Rotationsreihenfolge - die
    // sorgt zwar fuer Abwechslung, aber die Abwechslung sichert seit dem
    // 24.08. das Bildgedaechtnis im Tor, und zwar am Motiv statt an der
    // Position. Damit ist die Reihenfolge hier frei fuer das, was sie
    // besser kann: das schaerfste Material zuerst zeigen.
    kandidaten.sort(
      (a, b) =>
        Number(b.hochformat) - Number(a.hochformat) ||
        b.breite * b.hoehe - a.breite * a.hoehe,
    );
    const hoch = kandidaten.filter((k) => k.hochformat).length;
    // Wirklich das groesste suchen, nicht das erste: Nach dem Sortieren
    // steht vorne das beste HOCHFORMAT, das muss nicht das groesste sein.
    // Die erste Fassung meldete fuer Battlefield 6 "groesstes 1080x1080",
    // waehrend ein 3840x2160 im selben Satz lag - eine Protokollzeile, die
    // luegt, ist schlimmer als keine.
    const groesste = kandidaten.reduce((a, b) => (b.breite * b.hoehe > a.breite * a.hoehe ? b : a));
    console.log(
      `  Spielbilder: ${kandidaten.length} Kandidaten, davon ${hoch} im Hochformat` +
        ` (groesstes ${groesste.breite}x${groesste.hoehe})`,
    );

    return { kandidaten, poolGroesse: eintraege.length, spielKey, publisher: pool.publisher };
  } catch (err) {
    console.log(`  Spielbild-Suche fehlgeschlagen (${err.message})`);
    return null;
  }
}
