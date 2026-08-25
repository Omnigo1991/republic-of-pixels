// BILD-PROBELAUF (Tim, 24.08.2026: "erst will ich sichergehen, dass
// Instagram gut funktioniert").
//
// WARUM ES DAS GIBT: Der Bildweg - Material holen, Tor, Schnitt, Grafik,
// Abnahme - laesst sich nur dort vollstaendig pruefen, wo der
// Zugangsschluessel liegt, also in GitHub Actions. Bisher hiess pruefen
// darum: veroeffentlichen und zusehen. Genau so sind die Fehler vom 24.08.
// auf Tims Instagram gelandet.
//
// Dieser Lauf geht denselben Weg mit denselben Bausteinen, aber er postet
// nichts, committet nichts und aendert keinen State. Am Ende liegen die
// fertigen Grafiken als Anhang am Lauf und eine Tabelle im Protokoll:
// welches Material gefunden wurde, welches Bild und welcher Schnitt
// gewonnen haben, wie hoch aufgeloest die Quelle war und was die Abnahme
// dazu sagt.
//
// AUSDRUECKLICHE LUECKE: Die Schlagzeile wird hier aus dem Artikeltitel
// gebildet, nicht von der Redaktion erzeugt. Der Probelauf prueft den
// BILDWEG, nicht die Textauswahl - wer Schlagzeilen pruefen will, braucht
// einen eigenen Lauf.

import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { holeSpielBildKandidaten } from "./lib/keyart.mjs";
import { waehleBild, torBericht, zaehleTorEntscheidung } from "./lib/bildtor.mjs";
import { renderKarte } from "./lib/instagram-karte.mjs";
import { pruefeGrafik } from "./lib/abnahme.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUS = join(ROOT, "probelauf");
const ANZAHL = Number(process.env.PROBE_ANZAHL ?? 6);

mkdirSync(AUS, { recursive: true });

/** Titel in zwei moeglichst gleich lange Zeilen brechen. */
function zweiZeilen(titel) {
  const w = titel.split(/\s+/);
  let beste = 1;
  let diff = Infinity;
  for (let i = 1; i < w.length; i++) {
    const d = Math.abs(w.slice(0, i).join(" ").length - w.slice(i).join(" ").length);
    if (d < diff) { diff = d; beste = i; }
  }
  return [[w.slice(0, beste).join(" ")], [w.slice(beste).join(" ")]];
}

const D = join(ROOT, "src", "content", "articles");
const artikel = readdirSync(D)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(D, f), "utf8")))
  .filter((a) => (a.tags ?? []).length)
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .slice(0, ANZAHL);

console.log(`Probelauf ueber ${artikel.length} Meldungen. Es wird NICHTS gepostet.\n`);

// Bildgedaechtnis wie im echten Lauf, damit sich zeigt, ob die
// Wiederholungssperre greift.
const letzteBilder = [];
const zeilen = [];

for (const a of artikel) {
  const spiel = (a.tags ?? [])[0];
  console.log(`--- ${a.slug}`);
  const vorrat = await holeSpielBildKandidaten({
    gameName: spiel,
    rotation: 0,
    anzahl: 6,
    outPrefix: join(tmpdir(), `probe-${a.slug}`),
  });
  if (!vorrat) {
    console.log("  kein Material gefunden");
    zeilen.push({ slug: a.slug, spiel, ergebnis: "kein Material" });
    continue;
  }
  const tor = await waehleBild({
    kandidaten: vorrat.kandidaten,
    schlagzeile: a.title,
    spielName: spiel,
    jahr: vorrat.jahr ?? null,
    letzteBilder,
  });
  zaehleTorEntscheidung(Boolean(tor.gewaehlt));
  if (!tor.gewaehlt) {
    console.log(`  kein Bild bestanden: ${tor.grund}`);
    zeilen.push({ slug: a.slug, spiel, ergebnis: `verworfen - ${tor.grund}` });
    continue;
  }
  letzteBilder.push({
    motivFinger: tor.gewaehlt.motivFinger ?? null,
    spielKey: tor.gewaehlt.spielKey ?? null,
    poolIndex: tor.gewaehlt.poolIndex ?? null,
  });

  const pfad = join(AUS, `${a.slug}.jpg`);
  let karte;
  try {
    karte = await renderKarte({
      headlineLines: zweiZeilen(a.title),
      kicker: spiel,
      imagePath: tor.gewaehlt.pfad,
      positionX: tor.gewaehlt.positionX,
      outPath: pfad,
      chromium,
    });
  } catch (err) {
    console.log(`  Grafik abgelehnt: ${err.message}`);
    zeilen.push({ slug: a.slug, spiel, ergebnis: `Grafik abgelehnt - ${err.message}` });
    continue;
  }
  const abnahme = await pruefeGrafik(pfad, 3, "bild");
  zeilen.push({
    slug: a.slug,
    spiel,
    quelle: `${tor.gewaehlt.quelle.width}x${tor.gewaehlt.quelle.height}`,
    herkunft: tor.gewaehlt.herkunft,
    schnitt: `${tor.gewaehlt.positionX}%`,
    lupe: `${tor.gewaehlt.vergroesserung.toFixed(2)}x`,
    wort: `${karte.grosswort} ${karte.wortgroesse}px`,
    ergebnis: abnahme.ok ? "OK" : `Abnahme: ${abnahme.fehler.join("; ")}`,
  });
}

console.log("\n================ ERGEBNIS ================");
console.log(
  "Quelle       Lupe   Schnitt  Grosswort              Herkunft                     Ergebnis",
);
for (const z of zeilen) {
  console.log(
    `${String(z.quelle ?? "-").padEnd(12)} ${String(z.lupe ?? "-").padEnd(6)} ` +
      `${String(z.schnitt ?? "-").padEnd(8)} ${String(z.wort ?? "-").padEnd(22)} ` +
      `${String(z.herkunft ?? "-").padEnd(28)} ${z.ergebnis}`,
  );
}
torBericht();

// Wiederholung nachrechnen: Wie oft wurde dasselbe Quellbild gewaehlt?
const kennungen = zeilen.filter((z) => z.quelle).map((z) => `${z.spiel}|${z.herkunft}`);
const doppelt = kennungen.filter((k, i) => kennungen.indexOf(k) !== i);
console.log(
  doppelt.length
    ? `::warning::${doppelt.length} Wiederholung(en) trotz Bildgedaechtnis: ${[...new Set(doppelt)].join(", ")}`
    : "Wiederholungen: keine",
);
console.log(`\nGrafiken liegen unter probelauf/ und haengen am Lauf.`);
