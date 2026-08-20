import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FEEDS } from "./feeds.mjs";
import { fetchAllFeeds } from "./lib/rss.mjs";

// EVENT-WÄCHTER (Tim, 12.08.2026).
//
// ANLASS: Geoff Keighley bestätigte am 11.08. den Termin der Game Awards
// (10. Dezember). Zwei unserer Quellen meldeten es - bei uns stand trotzdem
// weiter "ERWARTET", weil events.json von Hand gepflegt wird. Tim: "Wir
// müssen dies weitestgehend automatisieren."
//
// WAS DIESER WÄCHTER TUT UND WAS NICHT: Er ändert NICHTS an events.json. Er
// meldet nur. Bewusst so, denn ein Datum aus einer Schlagzeile zu lesen ist
// unzuverlässig - "Set for August" kann eine spielspezifische State of Play
// meinen statt Sonys grosse Show, und ein falsches Datum bei einem
// Grossereignis wäre peinlicher als ein fehlender Eintrag. Ein Mensch
// entscheidet, der Wächter sorgt nur dafür, dass niemand es übersieht.
//
// Die anderen beiden Stufen der Automatik arbeiten dagegen ohne Zutun:
//   - Abgelaufene Termine fallen über dateEnd von selbst aus dem Radar.
//   - Der Status wird aus den Daten abgeleitet: Steht ein konkretes
//     Startdatum, gilt der Termin als fixiert (siehe EventRadar.tsx).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVENTS = join(ROOT, "src", "content", "events.json");

// Wörter, die auf eine Terminbestätigung hindeuten - in beiden Sprachen,
// weil die meisten unserer Quellen englisch sind.
const BESTAETIGT =
  /\b(confirm|confirmed|announce[sd]?|announcement|dated|set for|scheduled|takes place|returns on|bestätigt|angekündigt|Termin steht|findet statt)\b/i;

function eintraege() {
  try {
    return JSON.parse(readFileSync(EVENTS, "utf8")).events ?? [];
  } catch {
    return [];
  }
}

// Suchbegriffe aus dem Eventnamen: die aussagekräftigen Wörter, damit
// "PlayStation State of Play" auch bei "State of Play" anschlägt.
function begriffe(name) {
  return String(name)
    .toLowerCase()
    .replace(/\b(20\d\d)\b/g, "")
    .split(/[^a-zäöüß0-9]+/)
    .filter((w) => w.length >= 4);
}

function passt(titel, worte) {
  const t = titel.toLowerCase();
  const treffer = worte.filter((w) => t.includes(w)).length;
  // Mindestens zwei Namensbestandteile - sonst schlägt "Direct" auf jede
  // beliebige Meldung an.
  return worte.length === 1 ? treffer === 1 : treffer >= 2;
}

async function main() {
  const offen = eintraege().filter((e) => !e.dateStart);
  if (offen.length === 0) {
    console.log("Event-Wächter: alle Termine haben ein konkretes Datum - nichts zu prüfen.");
    return;
  }

  const res = await fetchAllFeeds(FEEDS);
  const seit = Date.now() - 72 * 3600000;
  const meldungen = res
    .flatMap((r) => r.items)
    .filter((i) => i.publishedAt && i.publishedAt.getTime() > seit);

  let funde = 0;
  for (const e of offen) {
    const worte = begriffe(e.name);
    const treffer = meldungen.filter(
      (m) => passt(m.title, worte) && BESTAETIGT.test(m.title)
    );
    if (treffer.length === 0) continue;
    funde++;
    console.log(`::warning::Event-Wächter: "${e.name}" steht bei uns als "${e.status}", ${treffer.length} Quelle(n) melden eine Bestätigung. Bitte events.json prüfen.`);
    for (const t of treffer.slice(0, 3)) {
      console.log(`    [${t.feedId}] ${t.title.slice(0, 100)}`);
    }
  }

  console.log(
    `Event-Wächter: ${offen.length} Termin(e) ohne Datum geprüft, ${funde} mit Bestätigungs-Hinweis.`
  );
}

main().catch((err) => {
  // Wie überall: Ein Fehler hier darf den Lauf nicht abbrechen.
  console.log(`Event-Wächter übersprungen (${err.message})`);
});
