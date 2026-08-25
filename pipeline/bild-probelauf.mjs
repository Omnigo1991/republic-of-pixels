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

import { readdirSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { holeSpielBildKandidaten } from "./lib/keyart.mjs";
import { waehleBild, torBericht, zaehleTorEntscheidung } from "./lib/bildtor.mjs";
import { renderKarte } from "./lib/instagram-karte.mjs";
import { pruefeGrafik } from "./lib/abnahme.mjs";
import { askClaude, parseJsonResponse, MODELL_HANDWERK } from "./lib/claude.mjs";

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

/**
 * Der Bildpfad, den die Pipeline fuer das Pressebild benutzt - identische
 * Reihenfolge wie portraitPathFor in instagram.mjs.
 */
function pressebildPfad(a) {
  if (!a.image?.src) return null;
  const original = join(ROOT, "public", a.image.src);
  if (existsSync(original)) return original;
  const portrait = join(ROOT, "public", a.image.src.replace(/\.webp$/, "-portrait.webp"));
  return existsSync(portrait) ? portrait : null;
}

/**
 * Spielname wie im Auswahl-Prompt der Pipeline (instagram.mjs): der exakte
 * offizielle Titel - oder null, wenn die Meldung kein einzelnes Spiel
 * betrifft. Ohne diesen Schritt sucht der Probelauf nach Spielen, die es
 * nicht gibt.
 */
async function spielNameFuer(a) {
  try {
    const roh = await askClaude({
      model: MODELL_HANDWERK,
      maxTokens: 2000,
      system: "Du antwortest ausschliesslich mit JSON.",
      prompt: `Schlagzeile: "${a.title}"\nAnrisstext: "${(a.excerpt ?? "").slice(0, 300)}"\nSchlagworte: ${(a.tags ?? []).join(", ")}\n\n"gameName" = der exakte offizielle Titel des Spiels, um das sich die Story dreht (fuer die Key-Art-Suche, z. B. "Gothic 1 Remake", "Lies of P") - oder null, wenn die Story kein einzelnes Spiel betrifft (Firmen-News, Hardware, Personalien).\n\nAntworte NUR mit JSON: {"gameName": "..." oder null}`,
    });
    return parseJsonResponse(roh)?.gameName ?? null;
  } catch (err) {
    console.log(`  Spielname nicht bestimmbar (${err.message})`);
    return null;
  }
}

const D = join(ROOT, "src", "content", "articles");
const artikel = readdirSync(D)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(D, f), "utf8")))
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .slice(0, ANZAHL);

console.log(`Probelauf ueber ${artikel.length} Meldungen. Es wird NICHTS gepostet.\n`);

// Bildgedaechtnis wie im echten Lauf, damit sich zeigt, ob die
// Wiederholungssperre greift.
const letzteBilder = [];
const zeilen = [];

for (const a of artikel) {
  console.log(`--- ${a.slug}`);
  const spiel = await spielNameFuer(a);
  const kandidaten = [];
  let jahr = null;

  // Pressebild aus der Quelle - wie in der Pipeline nur, wenn die Quelle
  // mindestens 900 px hoch ist.
  const presse = pressebildPfad(a);
  if (presse && (a.image?.sourceHeight ?? 0) >= 900) {
    kandidaten.push({
      pfad: presse,
      credit: a.image?.credit ?? null,
      herkunft: "Pressebild aus der Meldung",
    });
  }

  if (spiel) {
    const vorrat = await holeSpielBildKandidaten({
      gameName: spiel,
      rotation: 0,
      anzahl: 6,
      outPrefix: join(tmpdir(), `probe-${a.slug}`),
    });
    if (vorrat) {
      kandidaten.push(...vorrat.kandidaten);
      jahr = vorrat.jahr ?? null;
    }
  } else {
    console.log("  kein einzelnes Spiel - nur Pressebild");
  }

  if (!kandidaten.length) {
    console.log("  kein Material gefunden");
    zeilen.push({ slug: a.slug, spiel: spiel ?? "-", ergebnis: "kein Material" });
    continue;
  }
  const tor = await waehleBild({
    kandidaten,
    schlagzeile: a.title,
    spielName: spiel,
    jahr,
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
for (const z of zeilen) {
  const kopf = `${(z.spiel ?? "-").slice(0, 24).padEnd(26)}`;
  if (!z.quelle) {
    console.log(`${kopf} ${z.ergebnis}`);
    continue;
  }
  console.log(
    `${kopf} ${String(z.quelle).padEnd(11)} ${String(z.lupe).padEnd(6)} ` +
      `Schnitt ${String(z.schnitt).padEnd(5)} ${String(z.herkunft).padEnd(38)} ${z.ergebnis}`,
  );
}

// Aufschluesseln, WORAN es lag - eine nackte Quote sagt nicht, ob die
// Messlatte zu streng ist oder das Material schlecht.
const zaehle = (f) => zeilen.filter(f).length;
console.log(
  `\nDavon: ${zaehle((z) => z.ergebnis === "OK")} mit Bild, ` +
    `${zaehle((z) => z.ergebnis === "kein Material")} ohne jedes Material, ` +
    `${zaehle((z) => String(z.ergebnis).startsWith("verworfen"))} vom Tor verworfen, ` +
    `${zaehle((z) => String(z.ergebnis).startsWith("Grafik abgelehnt"))} an der Vorlage gescheitert, ` +
    `${zaehle((z) => String(z.ergebnis).startsWith("Abnahme"))} an der Abnahme.`,
);
console.log(
  `Meldungen ohne einzelnes Spiel: ${zaehle((z) => !z.spiel || z.spiel === "-")} - dort gibt es nur das Pressebild.`,
);
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
