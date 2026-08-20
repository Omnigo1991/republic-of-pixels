// Slot-Rückgabe nach Publish-Fehlern (09.08.2026, "API access blocked"):
// Die Prepare-Phase markiert Posts OPTIMISTISCH als gepostet (Schutz gegen
// Doppelposts). Scheitert die Veröffentlichung, schreibt publish die
// betroffenen Slugs nach .ig-failed.json - dieses Skript nimmt die
// Markierung zurück (Slot + Wechsel-Zähler), damit ein späterer Lauf die
// Story erneut versucht. Der Workflow committet die State-Änderung danach.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { notiere, GRUND } from "./lib/ausfall.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "pipeline", "state.json");
const FAILED_FILE = join(ROOT, ".ig-failed.json");

if (!existsSync(FAILED_FILE)) {
  console.log("Keine fehlgeschlagenen Posts - nichts zu entsperren.");
  process.exit(0);
}

const fehlgeschlagen = JSON.parse(readFileSync(FAILED_FILE, "utf8"));
const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
let zurueck = 0;

for (const eintrag of fehlgeschlagen) {
  // Grund ins Tagesregister eintragen, damit die Tagesbilanz abends nicht
  // nur meldet DASS Posts fehlen, sondern auch WORAN es lag. Aeltere
  // Fehlerdateien haben noch keinen Grund - dann zaehlt der haeufigste Fall.
  notiere(state, eintrag.grund ?? GRUND.INSTAGRAM, eintrag.slug);
  if (state.instagram?.posted?.[eintrag.slug]) {
    delete state.instagram.posted[eintrag.slug];
    zurueck++;
  }
  if (eintrag.nichtBreaking && state.instagram?.wechsel?.nichtBreaking > 0) {
    state.instagram.wechsel.nichtBreaking--;
  }
}

// Immer schreiben: Auch wenn kein Slot zurueckzugeben war, ist der Grund
// jetzt im Tagesregister vermerkt und soll nicht verlorengehen.
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
unlinkSync(FAILED_FILE);
console.log(
  `${zurueck} Slot(s) zurückgegeben: ${fehlgeschlagen.map((f) => f.slug).join(", ")}`,
);
