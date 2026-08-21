// Release-Radar-Pflege: erntet Release-Termine aus dem EIGENEN
// Artikelbestand und traegt sie in src/content/releases.json nach.
//
// Warum aus den eigenen Artikeln: Jeder Artikel hat das Faktentor
// durchlaufen - was hier steht, ist belegt. Kein Modellaufruf, keine
// externe Quelle, rein deterministisch (Eine Regel, die nur im Prompt
// steht, ist keine Regel - dieses Skript IST die Regel).
//
// Verhalten:
//  - add-only: bestehende Eintraege werden NIE veraendert oder geloescht
//    (Handpflege bleibt Handpflege). Neue Titel kommen dazu.
//  - Abdeckungsbericht: meldet, wie viele Eintraege der laufende und der
//    Folgemonat haben. Unter MIN_PRO_MONAT gibt es Exit 1 - der Lauf
//    wird rot und faellt auf, statt still duenn zu bleiben.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIKEL = join(WURZEL, "src/content/articles");
const ZIEL = join(WURZEL, "src/content/releases.json");
const MIN_PRO_MONAT = 3;

const MONATE = { januar: 1, februar: 2, maerz: 3, märz: 3, april: 4, mai: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };

// "erscheint am 29. Oktober 2026", "Release ist der 3. September 2026",
// "startet am 1. September 2026", "Release: 17. September 2026"
const MUSTER = /(?:erscheint|erscheinen|release|startet|launch)[^.!?]{0,60}?\b(?:am|der|ist der|:)\s*(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/gi;

function titelAus(artikel) {
  // Spielname = das Tag, das im Titel am FRUEHESTEN beginnt (unsere
  // Schlagzeilen nennen das Spiel zuerst; Studio/Publisher folgen).
  // Bei gleicher Position gewinnt das laengere Tag. Verglichen wird
  // normalisiert, damit "Fortune's" und Doppelpunkte nicht stoeren.
  const norm = (t) => t.toLowerCase().replace(/[^a-z0-9äöü0-9 ]/gi, " ").replace(/\s+/g, " ").trim();
  const titelNorm = norm(artikel.title);
  let best = null, bestPos = Infinity;
  for (const tag of artikel.tags ?? []) {
    if (tag.length < 4) continue;
    const pos = titelNorm.indexOf(norm(tag));
    if (pos === -1) continue;
    if (pos < bestPos || (pos === bestPos && tag.length > (best?.length ?? 0))) {
      best = tag; bestPos = pos;
    }
  }
  return best;
}

// Duplikat-Pruefung: normalisiert und in BEIDE Richtungen enthalten
// ("Modern Warfare 4" ist Duplikat von "CoD: Modern Warfare 4").
function istDuplikat(titel, vorhandene) {
  const norm = (t) => t.toLowerCase().replace(/[^a-z0-9äöü ]/g, "").replace(/\s+/g, " ").trim();
  const n = norm(titel);
  for (const v of vorhandene) {
    const nv = norm(v);
    if (nv.includes(n) || n.includes(nv)) return true;
  }
  return false;
}

const releases = JSON.parse(readFileSync(ZIEL, "utf8"));
const vorhandeneTitel = new Set(releases.map((r) => r.title.toLowerCase()));
const vorhandeneSlugs = new Set(releases.map((r) => r.articleSlug).filter(Boolean));

const kandidaten = new Map(); // titel -> {datum, plattformen, slug, stimmen}
for (const datei of readdirSync(ARTIKEL)) {
  if (!datei.endsWith(".json")) continue;
  const a = JSON.parse(readFileSync(join(ARTIKEL, datei), "utf8"));
  const text = JSON.stringify(a);
  for (const m of text.matchAll(MUSTER)) {
    const [ , tagStr, monatStr, jahrStr ] = m;
    const monat = MONATE[monatStr.toLowerCase()];
    const datum = `${jahrStr}-${String(monat).padStart(2, "0")}-${String(+tagStr).padStart(2, "0")}`;
    // Nur Zukunft und nahe Vergangenheit (7 Tage) - Uraltdaten sind
    // Rueckblicke, keine Radar-Eintraege.
    const alter = (new Date(datum) - new Date()) / 86400000;
    if (alter < -7 || alter > 200) continue;
    // Updates/Patches gehoeren ins Patch-Radar, nicht hierher.
    if (/update|patch|hotfix|season|saison|dlc|addon|add-on/i.test(a.title)) continue;
    if (vorhandeneSlugs.has(a.slug)) continue; // Artikel ist schon als Beleg verlinkt
    const titel = titelAus(a);
    if (!titel) continue;
    const kern = titel.toLowerCase();
    if (istDuplikat(titel, vorhandeneTitel)) continue;
    const alt = kandidaten.get(kern);
    if (!alt) kandidaten.set(kern, { titel, datum, plattformen: a.platforms ?? [], slug: a.slug, stimmen: 1 });
    else { alt.stimmen++; if (a.slug.includes("release")) alt.slug = a.slug; }
  }
}

let neu = 0;
for (const k of kandidaten.values()) {
  // Leaks und Einzeltreffer ohne "release" im Slug bleiben draussen -
  // lieber ein Loch im Radar als ein falscher Termin.
  const artikel = JSON.parse(readFileSync(join(ARTIKEL, `${k.slug}.json`), "utf8"));
  if (artikel.category === "leaks") continue;
  if (k.stimmen < 2 && !/release|erscheint|launch/i.test(k.slug)) continue;
  if (istDuplikat(k.titel, vorhandeneTitel)) continue;
  releases.push({ title: k.titel, date: k.datum, platforms: k.plattformen, articleSlug: k.slug });
  vorhandeneTitel.add(k.titel.toLowerCase());
  neu++;
  console.log(`  + ${k.titel} (${k.datum}) aus ${k.slug}`);
}
releases.sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(ZIEL, JSON.stringify(releases, null, 2) + "\n");
console.log(`Release-Radar: ${neu} neu, ${releases.length} gesamt.`);

// Abdeckungsbericht: laufender Monat + Folgemonat
const jetzt = new Date();
const monate = [0, 1].map((v) => {
  const d = new Date(jetzt.getFullYear(), jetzt.getMonth() + v, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
});
let ok = true;
for (const m of monate) {
  const n = releases.filter((r) => r.date.startsWith(m)).length;
  console.log(`Abdeckung ${m}: ${n} Eintraege ${n >= MIN_PRO_MONAT ? "(ok)" : `(ZU DUENN, min. ${MIN_PRO_MONAT})`}`);
  if (n < MIN_PRO_MONAT) ok = false;
}
if (!ok) {
  console.error("Release-Radar: Abdeckung zu duenn - bitte redaktionell nachtragen.");
  process.exit(1);
}
