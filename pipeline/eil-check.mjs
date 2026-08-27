// EILMELDUNGS-VORPRÜFUNG (Tim, 27.08.2026: "Bau Welle 1 so um").
//
// WOZU DAS DA IST: Die News-Pipeline läuft alle vier Stunden. Bricht ein Leak
// um 14:10, sind wir um 18:05 da - die Mitbewerber um 14:20. Bei brandneuen
// Themen hat niemand einen Autoritätsvorsprung, dort gewinnt schlicht, wer
// zuerst da ist. Das ist die einzige Stelle, an der reines Tempo Rennen
// entscheidet.
//
// WARUM NICHT EINFACH DIE PIPELINE HÄUFIGER LAUFEN LASSEN: Der Workflow
// "News-Pipeline" macht weit mehr als Artikel. Er bereitet Instagram-Posts
// vor und veröffentlicht sie, aktualisiert Deals und Charts, erzeugt das
// Pixel-Rätsel, baut die Seite und deployt. Im Kopf des Workflows steht
// ausdrücklich, dass der Vier-Stunden-Takt so gewählt ist, dass die
// Instagram-Tageskurve ihre fünf Posts erreicht. Ihn auf 30 Minuten zu
// stellen hiesse, an all dem gleichzeitig zu ziehen - bei achtfacher
// CI-Laufzeit und achtfacher Zahl an Deployments.
//
// DIESES SKRIPT IST DESHALB EIN TÜRSTEHER. Es läuft alle 30 Minuten, braucht
// KEINE npm-Pakete (deshalb der handgeschriebene RSS-Leser weiter unten) und
// ist nach wenigen Sekunden fertig. Nur wenn es tatsächlich eine Eilmeldung
// sieht, startet der teure Teil - und der veröffentlicht dann genau EINEN
// Artikel und rührt Instagram, Deals und Charts nicht an.
//
// KALIBRIEREN: node pipeline/eil-check.mjs --kalibrieren
// Holt die echten Feeds und rechnet für die letzten 24 Stunden durch, wie oft
// welche Schwelle angeschlagen hätte. Die Schwelle soll geschätzt NIE wieder
// geraten werden - sie wird gemessen.

import { FEEDS } from "./feeds.mjs";
import { eilverdacht } from "./lib/takt.mjs";
import { appendFileSync } from "node:fs";

const KALIBRIEREN = process.argv.includes("--kalibrieren");

/**
 * RSS/Atom lesen OHNE fast-xml-parser.
 *
 * Bewusst mit regulären Ausdrücken statt mit dem richtigen Parser aus
 * lib/rss.mjs: Dieses Skript soll ohne "npm ci" laufen, sonst kostet der
 * Türsteher mehr als die Tür. Wir brauchen hier auch nur Titel und Datum -
 * die vollständige, saubere Auswertung macht später die echte Pipeline.
 */
function eintraege(xml, feedId) {
  const liste = [];
  for (const block of xml.split(/<item[\s>]|<entry[\s>]/).slice(1)) {
    const titel = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) ?? [])[1];
    const datum = (block.match(/<pubDate>([^<]+)<\/pubDate>|<published>([^<]+)<\/published>/) ?? [])
      .slice(1)
      .find(Boolean);
    if (!titel || !datum) continue;
    const d = new Date(datum);
    if (isNaN(d)) continue;
    liste.push({ title: titel.trim(), feedId, publishedAt: d });
  }
  return liste;
}

async function holeAlle() {
  const alle = [];
  await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const r = await fetch(f.url, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; RepublicOfPixels/1.0)" },
          signal: AbortSignal.timeout(20000),
        });
        if (!r.ok) return;
        alle.push(...eintraege(await r.text(), f.id));
      } catch {
        // Ein toter Feed darf den Türsteher nicht aufhalten.
      }
    }),
  );
  return alle;
}

const kandidaten = await holeAlle();

if (KALIBRIEREN) {
  const jetzt = new Date();
  console.log(
    `${kandidaten.length} Einträge aus ${new Set(kandidaten.map((k) => k.feedId)).size} von ${FEEDS.length} Feeds.\n`,
  );
  // Nur die Quellenzahl wird durchgespielt, nicht das Zeitfenster: eilverdacht
  // liest EIL_FENSTER_MIN beim Laden des Moduls: um das Fenster zu variieren,
  // müsste man das Modul neu laden. Die Quellenzahl lässt sich dagegen sauber
  // nachträglich prüfen, weil eilverdacht die stärkste Gruppe samt ihrer
  // Quellenzahl immer zurückgibt - auch wenn sie die eingebaute Schwelle
  // verfehlt. Wer das Fenster ändern will, setzt EIL_FENSTER_MIN vor dem Start
  // und lässt den Kalibrierlauf erneut laufen.
  const fenster = Number(process.env.EIL_FENSTER_MIN ?? 60);
  console.log(`Zeitfenster: ${fenster} Minuten (über EIL_FENSTER_MIN änderbar)\n`);
  console.log("Schwelle   Trefferquote   verschiedene Storys");
  console.log("-".repeat(48));

  // Für jeden simulierten Zeitpunkt EINMAL rechnen, dann gegen alle
  // Schwellen prüfen - sonst rechnet der Lauf dieselbe Gruppierung siebenmal.
  const verlauf = [];
  for (let m = 24 * 60; m >= 0; m -= 30) {
    const z = new Date(jetzt.getTime() - m * 60000);
    verlauf.push(eilverdacht(kandidaten, z));
  }
  for (const quellen of [4, 5, 6, 7, 8, 9, 10, 12]) {
    const treffer = verlauf.filter((e) => e && e.quellen >= quellen);
    const storys = new Set(treffer.map((e) => e.wort));
    console.log(
      String(quellen).padStart(8) +
        String(Math.round((treffer.length / verlauf.length) * 100) + " %").padStart(15) +
        String(storys.size).padStart(21),
    );
  }

  // Und die Storys selbst, damit man sieht, ob die Schwelle das Richtige fängt.
  for (const quellen of [6, 8, 10]) {
    const gesehen = new Map();
    for (const e of verlauf) if (e && e.quellen >= quellen && !gesehen.has(e.wort)) gesehen.set(e.wort, e);
    console.log(`\nBei ${quellen} Quellen würden diese Storys auslösen:`);
    if (!gesehen.size) console.log("  (keine)");
    for (const [w, e] of gesehen) {
      console.log(`  [${w}] ${e.quellen} Quellen - "${e.titel.slice(0, 62)}"`);
    }
  }
  process.exit(0);
}

const urteil = eilverdacht(kandidaten);
const eil = !!urteil?.reicht;

if (urteil) {
  console.log(
    `Stärkste Gruppe: [${urteil.wort}] mit ${urteil.quellen} Quellen - "${urteil.titel.slice(0, 70)}"`,
  );
} else {
  console.log(`Keine Gruppe gebildet (${kandidaten.length} Einträge geprüft).`);
}
console.log(eil ? "EILMELDUNG - der Veröffentlichungsteil startet." : "Nichts Dringendes - Lauf endet hier.");

// Ergebnis an den Workflow zurückgeben.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `eil=${eil}\n`);
  if (urteil) {
    appendFileSync(process.env.GITHUB_OUTPUT, `wort=${urteil.wort}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `quellen=${urteil.quellen}\n`);
  }
}
