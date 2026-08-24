// INSTAGRAM-RESONANZ (Tim, 24.08.2026).
//
// WARUM: Tim fragt, welche Posts am besten laufen - und seit Tagen sind es
// höchstens 4 Likes. Wir konnten die Frage bisher nicht beantworten, weil
// wir zwar posten, aber nie zurücklesen. Über 70 Posts liegen draussen und
// wir wissen von keinem einzigen, wie er gelaufen ist.
//
// Dieses Skript holt die Kennzahlen zu jedem Post und stellt sie neben das,
// was wir selbst über ihn wissen: Spiel, Ressort, Format (Bild oder Reel),
// Uhrzeit, Grosswort. Erst dadurch wird aus "4 Likes" eine Frage, die man
// untersuchen kann - laufen Reels besser als Bilder? Bestimmte Spiele?
// Bestimmte Uhrzeiten?
//
// Läuft in GitHub Actions, wo das Zugangstoken liegt. Ausgabe ist eine
// Tabelle im Protokoll plus pipeline/resonanz.json für spätere Vergleiche.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IG_API = "https://graph.instagram.com/v23.0";

const token = process.env.IG_ACCESS_TOKEN;
if (!token) {
  console.log("IG_ACCESS_TOKEN fehlt - Resonanz kann nicht abgefragt werden.");
  process.exit(0);
}

const zurichTag = (d) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(d);
const zurichStunde = (d) =>
  Number(
    new Intl.DateTimeFormat("de-CH", {
      timeZone: "Europe/Zurich",
      hour: "2-digit",
      hour12: false,
    }).format(d),
  );

async function ig(pfad, params = {}) {
  const url = new URL(`${IG_API}${pfad}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const daten = await res.json();
  if (!res.ok) throw new Error(daten?.error?.message ?? `HTTP ${res.status}`);
  return daten;
}

// --- Was wir selbst über unsere Posts wissen ---
const state = JSON.parse(readFileSync(join(ROOT, "pipeline", "state.json"), "utf8"));
const posted = state.instagram?.posted ?? {};
const cards = state.instagram?.cards ?? {};

function artikelInfo(slug) {
  const p = join(ROOT, "src", "content", "articles", `${slug}.json`);
  if (!existsSync(p)) return {};
  const a = JSON.parse(readFileSync(p, "utf8"));
  return {
    spiel: (a.tags ?? [])[0] ?? "?",
    kategorie: a.category,
    titel: a.title,
  };
}

// Der Dateiname der Karte verrät das Format: .mp4 = Reel, .jpg = Bild.
function formatVon(slug) {
  const treffer = Object.keys(cards).find((rel) => rel.includes(slug));
  if (!treffer) return "?";
  return treffer.endsWith(".mp4") ? "Reel" : "Bild";
}

// --- Kennzahlen abholen ---
// Instagram liefert Likes und Kommentare direkt am Medium; Reichweite und
// Speicherungen nur über den Insights-Zweig, der für manche Kontotypen
// gesperrt ist. Darum getrennt abfragen und Fehler einzeln auffangen -
// lieber Teilzahlen als gar keine.
const medien = [];
let nach = null;
do {
  const seite = await ig("/me/media", {
    fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count",
    limit: "50",
    ...(nach ? { after: nach } : {}),
  });
  medien.push(...(seite.data ?? []));
  nach = seite.paging?.cursors?.after && seite.paging?.next ? seite.paging.cursors.after : null;
} while (nach && medien.length < 200);

console.log(`Abgefragt: ${medien.length} Posts vom Konto.\n`);

// Zuordnung Medium -> unser Artikel über den Link in der Caption bzw. die
// Reihenfolge. Der zuverlässigste Anker ist die Uhrzeit: Wir kennen unsere
// eigenen Posting-Zeitpunkte auf die Minute.
const unsere = Object.entries(posted)
  .map(([slug, iso]) => ({ slug, zeit: new Date(iso) }))
  .sort((a, b) => b.zeit - a.zeit);

function passenderArtikel(medium) {
  const t = new Date(medium.timestamp);
  let beste = null;
  let kleinsterAbstand = Infinity;
  for (const u of unsere) {
    const abstand = Math.abs(u.zeit - t);
    if (abstand < kleinsterAbstand) {
      kleinsterAbstand = abstand;
      beste = u;
    }
  }
  // Mehr als eine Stunde Abstand heisst: gehört nicht zusammen.
  return kleinsterAbstand <= 60 * 60 * 1000 ? beste : null;
}

const zeilen = [];
for (const m of medien) {
  const treffer = passenderArtikel(m);
  const info = treffer ? artikelInfo(treffer.slug) : {};
  const t = new Date(m.timestamp);
  let reichweite = null;
  let gespeichert = null;
  try {
    const ins = await ig(`/${m.id}/insights`, { metric: "reach,saved,shares" });
    for (const e of ins.data ?? []) {
      const wert = e.values?.[0]?.value ?? null;
      if (e.name === "reach") reichweite = wert;
      if (e.name === "saved") gespeichert = wert;
    }
  } catch {
    // Insights sind nicht für jedes Konto und jedes Medium freigegeben -
    // Likes und Kommentare haben wir trotzdem.
  }
  zeilen.push({
    id: m.id,
    tag: zurichTag(t),
    stunde: zurichStunde(t),
    format: treffer ? formatVon(treffer.slug) : m.media_type === "VIDEO" ? "Reel" : "Bild",
    spiel: info.spiel ?? "?",
    titel: (info.titel ?? m.caption ?? "").slice(0, 52),
    likes: m.like_count ?? 0,
    kommentare: m.comments_count ?? 0,
    reichweite,
    gespeichert,
    permalink: m.permalink,
  });
}

zeilen.sort((a, b) => b.likes - a.likes || (b.reichweite ?? 0) - (a.reichweite ?? 0));

console.log("=== BESTE POSTS (nach Likes) ===");
console.log("Likes  Komm  Reich  Format  Datum       Std  Spiel / Titel");
for (const z of zeilen.slice(0, 15)) {
  console.log(
    `${String(z.likes).padStart(5)}  ${String(z.kommentare).padStart(4)}  ` +
      `${String(z.reichweite ?? "-").padStart(5)}  ${z.format.padEnd(6)}  ${z.tag}  ` +
      `${String(z.stunde).padStart(2)}h  ${z.spiel} - ${z.titel}`,
  );
}

const mittel = (liste, feld) => {
  const w = liste.map((z) => z[feld]).filter((v) => typeof v === "number");
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
};

console.log("\n=== NACH FORMAT ===");
for (const f of ["Reel", "Bild"]) {
  const l = zeilen.filter((z) => z.format === f);
  if (!l.length) continue;
  console.log(
    `${f.padEnd(6)} ${String(l.length).padStart(3)} Posts   Likes ⌀ ${(mittel(l, "likes") ?? 0).toFixed(1)}   Reichweite ⌀ ${mittel(l, "reichweite")?.toFixed(0) ?? "-"}`,
  );
}

console.log("\n=== NACH UHRZEIT ===");
const nachStunde = new Map();
for (const z of zeilen) {
  if (!nachStunde.has(z.stunde)) nachStunde.set(z.stunde, []);
  nachStunde.get(z.stunde).push(z);
}
for (const [std, l] of [...nachStunde].sort((a, b) => a[0] - b[0])) {
  console.log(
    `${String(std).padStart(2)}h   ${String(l.length).padStart(3)} Posts   Likes ⌀ ${(mittel(l, "likes") ?? 0).toFixed(1)}`,
  );
}

console.log("\n=== NACH SPIEL (ab 2 Posts) ===");
const nachSpiel = new Map();
for (const z of zeilen) {
  if (!nachSpiel.has(z.spiel)) nachSpiel.set(z.spiel, []);
  nachSpiel.get(z.spiel).push(z);
}
const spielListe = [...nachSpiel]
  .filter(([, l]) => l.length >= 2)
  .map(([s, l]) => ({ spiel: s, anzahl: l.length, likes: mittel(l, "likes") ?? 0 }))
  .sort((a, b) => b.likes - a.likes);
for (const s of spielListe.slice(0, 12)) {
  console.log(`${s.spiel.slice(0, 28).padEnd(30)} ${String(s.anzahl).padStart(3)} Posts   Likes ⌀ ${s.likes.toFixed(1)}`);
}

writeFileSync(
  join(ROOT, "pipeline", "resonanz.json"),
  JSON.stringify({ abgerufenAm: new Date().toISOString(), posts: zeilen }, null, 2) + "\n",
);
console.log(`\nGespeichert: pipeline/resonanz.json (${zeilen.length} Posts)`);
