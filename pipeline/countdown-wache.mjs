// COUNTDOWN-WACHE (Tim, 29.08.2026: "Countdown vom Eventradar ist wieder
// verschwunden. Und stelle sicher, dass das nicht mehr vorkommt").
//
// ZWEIMAL DERSELBE FEHLER, ZWEIMAL VON TIM GEFUNDEN.
//
// 25.08.: Im Bauteil stand ein fest eingetragener Termin. Als er vorbei
// war, verschwand der Block. Ich habe daraufhin auf events.json umgestellt.
//
// 29.08.: Wieder verschwunden. Meine Umstellung verlangte nämlich, dass
// jemand pro Termin zwei zusätzliche Felder von Hand nachträgt. Tokyo Game
// Show und The Game Awards standen längst mit Datum in der Liste, nur ohne
// diese Felder. Ich hatte die Handarbeit nicht abgeschafft, sondern nur
// verschoben.
//
// Beide Male galt dieselbe Hausregel, und beide Male habe ich sie verfehlt:
// Eine Regel, die nur in einer Datei steht, ist keine Regel. Das Bauteil
// versorgt sich jetzt selbst - jeder bestätigte Termin mit Datum zählt
// automatisch. Aber auch das hilft nichts, wenn irgendwann gar kein
// künftiger Termin mehr in der Liste steht.
//
// GENAU DAFÜR IST DIESE DATEI DA. Sie läuft in jedem Pipeline-Lauf mit und
// schaut voraus: Wie lange trägt unser Vorrat noch? Wird die Luft dünn,
// meldet sie es sichtbar, lange bevor auf der Startseite eine Lücke
// entsteht.
//
// Sie bricht den Lauf NICHT ab. Ein fehlender Termin ist kein Grund, das
// Veröffentlichen von Nachrichten zu stoppen - er ist ein Grund, jemandem
// Bescheid zu sagen.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVENTS = join(ROOT, "src", "content", "events.json");

/** Ab wie wenigen Tagen Vorrat wird gewarnt. */
const WARNSCHWELLE_TAGE = Number(process.env.COUNTDOWN_WARNUNG_TAGE ?? 21);

/**
 * Zielzeitpunkt eines Termins - MUSS gleich bleiben wie terminZiel() in
 * src/components/next/SektionsTitel.tsx. Stünde hier eine andere Regel,
 * wachte die Wache über etwas anderes als das, was der Leser sieht.
 */
export function terminZiel(e) {
  if (e.countdown === false) return null;
  if (e.status && e.status !== "fixiert") return null;
  if (e.startIso) {
    const t = new Date(e.startIso).getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (e.dateStart) {
    const t = new Date(`${e.dateStart}T00:00:00Z`).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

const daten = JSON.parse(readFileSync(EVENTS, "utf8"));
const jetzt = Date.now();

const kuenftig = (daten.events ?? [])
  .map((e) => ({ e, ziel: terminZiel(e) }))
  .filter((x) => x.ziel !== null && x.ziel > jetzt)
  .sort((a, b) => a.ziel - b.ziel);

const tage = (ms) => (ms - jetzt) / 86400000;

console.log(`Countdown-Wache - ${kuenftig.length} künftige Termine mit Datum:`);
for (const { e, ziel } of kuenftig) {
  console.log(`  in ${tage(ziel).toFixed(0).padStart(4)} Tagen   ${e.name}`);
}

// Termine ohne Datum sind nicht wertlos - sie stehen im Event-Radar. Sie
// tragen nur den Countdown nicht, und genau das soll man sehen.
const ohneDatum = (daten.events ?? []).filter((e) => terminZiel(e) === null);
if (ohneDatum.length) {
  console.log(`\nOhne Countdown-Ziel (stehen weiterhin im Event-Radar):`);
  for (const e of ohneDatum) {
    const grund =
      e.countdown === false ? "ausdrücklich ausgeschlossen"
        : e.status && e.status !== "fixiert" ? `Status "${e.status}"`
          : "kein Datum hinterlegt";
    console.log(`  ${(e.name ?? "?").padEnd(30)} ${grund}`);
  }
}

if (kuenftig.length === 0) {
  console.log(
    `::error::Countdown-Wache: KEIN künftiger Termin mit Datum - der Countdown auf der Startseite ist JETZT leer. Bitte in src/content/events.json einen bestätigten Termin mit "dateStart" ergänzen.`,
  );
  process.exit(0);
}

const vorrat = tage(kuenftig.at(-1).ziel);
const naechster = kuenftig[0];

console.log(
  `\nNächster: ${naechster.e.name} in ${tage(naechster.ziel).toFixed(1)} Tagen. ` +
    `Vorrat reicht ${vorrat.toFixed(0)} Tage.`,
);

if (vorrat < WARNSCHWELLE_TAGE) {
  console.log(
    `::warning::Countdown-Wache: Der Terminvorrat reicht nur noch ${vorrat.toFixed(0)} Tage ` +
      `(letzter: ${kuenftig.at(-1).e.name}). Danach verschwindet der Countdown von der Startseite. ` +
      `Bitte in src/content/events.json einen weiteren bestätigten Termin mit "dateStart" ergänzen.`,
  );
} else {
  console.log("Vorrat ausreichend - keine Meldung nötig.");
}
