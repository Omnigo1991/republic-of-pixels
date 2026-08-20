// Charts-Radar-Datenbeschaffung: holt die meistgespielten Steam-Spiele
// (offizieller Charts-Endpoint, kein API-Schlüssel nötig) und schreibt die
// Top 8 nach src/content/charts.json. Läuft als Schritt der News-Pipeline,
// aktualisiert aber nur MONTAGS (Wochen-Charts, "jeden Montag neu") - plus
// Nachhol-Logik, falls alle Montags-Läufe ausfielen oder die Datei fehlt.
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "content", "charts.json");
const UA = { "User-Agent": "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com)" };

const zuerichTag = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(d);
const istMontag =
  new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", weekday: "short" }).format(new Date()) === "Mon";

// ISO-Kalenderwoche für den "KW 32"-Stempel auf der Seite.
//
// WELCHE WOCHE HIER STEHT (Tim, 12.08.2026): Steam liefert immer die
// ABGESCHLOSSENE Woche. Am Montag geholt, decken die Zahlen die Woche davor
// ab - der Stempel beschreibt also den Zeitraum der Daten, nicht den
// Abrufzeitpunkt. Bisher stimmte das nur zufällig: Die Rechnung las die
// UTC-Anteile, und der Montags-Lauf fiel auf 01:04 Zürich, was in London
// noch Sonntag war. Wäre der Lauf um 12 Uhr gewesen, hätte dort fälschlich
// die laufende Woche gestanden. Jetzt wird bewusst die Vorwoche in Zürcher
// Zeit berechnet - richtig unabhängig von der Uhrzeit des Laufs.
function isoWoche(d = new Date()) {
  const [jahr, monat, tag_] = zuerichTag(d).split("-").map(Number);
  const dt = new Date(Date.UTC(jahr, monat - 1, tag_ - 7));
  const tag = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - tag);
  const jahresanfang = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt - jahresanfang) / 86400000 + 1) / 7);
}

let bestehend = null;
try {
  bestehend = JSON.parse(readFileSync(OUT, "utf8"));
} catch {
  // keine Datei - erster Lauf schreibt sie
}

const letztesUpdate = bestehend?.updatedAt ? new Date(bestehend.updatedAt) : null;
const alterTage = letztesUpdate ? (Date.now() - letztesUpdate.getTime()) / 86400000 : Infinity;
const heuteSchonAktualisiert = letztesUpdate && zuerichTag(letztesUpdate) === zuerichTag();
const faellig = !bestehend || alterTage > 8 || (istMontag && !heuteSchonAktualisiert);

if (!faellig) {
  console.log(`Charts aktuell (Stand ${bestehend.updatedAt}) - kein Update fällig.`);
  process.exit(0);
}

const res = await fetch(
  "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/?format=json",
  { headers: UA, signal: AbortSignal.timeout(20000) }
);
if (!res.ok) {
  console.error(`Steam-Charts-API antwortet mit ${res.status} - charts.json bleibt unverändert.`);
  process.exit(0); // Pipeline nie blockieren, alte Charts bleiben stehen
}
const ranks = (await res.json())?.response?.ranks ?? [];

// Steams "Most Played" enthält auch Nicht-Spiele (Desktop-Tools laufen
// permanent im Hintergrund und sammeln so Spielerzahlen). Die gehören
// nicht in Gaming-Charts.
const NICHT_SPIELE = new Set([431960 /* Wallpaper Engine */, 250820 /* SteamVR */]);

// Namen + Artwork pro Spiel nachladen (appdetails). Einzelne Ausfälle
// (delistete/regionale Apps) überspringen wir und rücken nach, bis 8 stehen.
const games = [];
for (const eintrag of ranks) {
  if (games.length >= 8) break;
  if (NICHT_SPIELE.has(eintrag.appid)) continue;
  try {
    const dres = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${eintrag.appid}&l=german&cc=de&filters=basic`,
      { headers: UA, signal: AbortSignal.timeout(15000) }
    );
    const data = (await dres.json())?.[eintrag.appid];
    if (!data?.success || !data.data?.name) {
      console.log(`  App ${eintrag.appid}: keine Details - übersprungen`);
      continue;
    }
    games.push({
      appId: eintrag.appid,
      rank: games.length + 1,
      // last_week_rank 0 = letzte Woche nicht in den Charts → "NEU".
      lastWeekRank: eintrag.last_week_rank ?? 0,
      steamRank: eintrag.rank,
      peak: eintrag.peak_in_game ?? 0,
      name: data.data.name.replace(/[™®]/g, "").trim(),
      image: data.data.header_image?.split("?")[0] ?? null,
      url: `https://store.steampowered.com/app/${eintrag.appid}/`,
    });
    await new Promise((r) => setTimeout(r, 300)); // Steam nicht hämmern
  } catch (err) {
    console.log(`  App ${eintrag.appid}: ${err.message} - übersprungen`);
  }
}

if (games.length < 4) {
  console.error(`Nur ${games.length} Spiele auflösbar - charts.json bleibt unverändert.`);
  process.exit(0);
}

// Anzeige-Reihenfolge: nach Wochen-Spitze (die Zahl, die wir zeigen) -
// Steams interne Sortierung mischt aktuelle Spielerzahlen rein und wirkt
// neben den Spitzenwerten unlogisch. Der Trend bleibt Steams eigener
// Wochenvergleich (last_week_rank vs. rank) und damit in sich stimmig.
games.sort((a, b) => b.peak - a.peak);
games.forEach((g, i) => (g.rank = i + 1));

writeFileSync(
  OUT,
  JSON.stringify({ updatedAt: new Date().toISOString(), kw: isoWoche(), games }, null, 2) + "\n"
);
console.log(`charts.json geschrieben: KW ${isoWoche()}, ${games.length} Spiele (Top: ${games[0].name}).`);
