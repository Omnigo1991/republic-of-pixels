// BILD-VERGLEICH VORHER / NACHHER (Tim, 25.08.2026: "Testen wir es").
//
// FRAGE: Was stünde über einem Artikel, wenn die Website ihr Bild beim
// Hersteller holte statt beim Mitbewerber?
//
// Heute nimmt acquireImage aus der Quellmeldung das ERSTE Bild, das sich
// herunterladen laesst - ohne Vergleich, ohne Pruefung - und schreibt den
// Namen der fremden Seite in die Bildzeile ("Bild: MeinMMO").
//
// Dieser Lauf geht den anderen Weg: Spielname bestimmen, offizielles
// Material bei Steam und IGDB holen, alle Kandidaten auf das
// Website-Format 1600x900 bringen und beurteilen lassen. Er aendert
// nichts - er legt nur beide Fassungen nebeneinander.
//
// WARUM EIN EIGENES URTEIL statt waehleBild aus dem Bild-Tor: Das Tor
// beurteilt 1080x1350 mit Glaskarte darueber - Motivschwerpunkt,
// Textkante, Ueberdeckung. Auf der Website liegt kein Text im Bild und das
// Format ist 16:9, also faellt genau der schwierige Teil weg. Wuerde ich
// das Tor unveraendert benutzen, beurteilte es einen Ausschnitt, den die
// Website nie zeigt - derselbe Fehler, der uns die erste Woche gekostet
// hat.

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { holeSpielBildKandidaten } from "./lib/keyart.mjs";
import { askClaude, parseJsonResponse, MODELL_URTEIL, MODELL_HANDWERK } from "./lib/claude.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUS = join(ROOT, "vergleich");
const BREITE = 1600;
const HOEHE = 900;

mkdirSync(AUS, { recursive: true });

const slugs = (process.env.VERGLEICH_SLUGS ?? "")
  .split(/[\s,]+/)
  .map((s) => s.trim().replace(/^.*\/artikel\//, "").replace(/\/$/, ""))
  .filter(Boolean);

if (!slugs.length) {
  console.log("VERGLEICH_SLUGS ist leer - nichts zu tun.");
  process.exit(0);
}

async function spielNameFuer(a) {
  const roh = await askClaude({
    model: MODELL_HANDWERK,
    maxTokens: 2000,
    system: "Du antwortest ausschliesslich mit JSON.",
    prompt: `Schlagzeile: "${a.title}"\nAnrisstext: "${(a.excerpt ?? "").slice(0, 300)}"\nSchlagworte: ${(a.tags ?? []).join(", ")}\n\n"gameName" = der exakte offizielle Titel des Spiels, um das sich die Story dreht - oder null, wenn die Story kein einzelnes Spiel betrifft.\n\nAntworte NUR mit JSON: {"gameName": "..." oder null}`,
  });
  return parseJsonResponse(roh)?.gameName ?? null;
}

/** Kandidat auf das Website-Format bringen - genau wie optimizeAndSave. */
async function auf169(pfad, zielPfad) {
  await sharp(pfad)
    .resize(BREITE, HOEHE, { fit: "cover", position: "attention" })
    .jpeg({ quality: 86 })
    .toFile(zielPfad);
  const m = await sharp(pfad).metadata();
  return {
    vorschau: zielPfad,
    breite: m.width ?? 0,
    hoehe: m.height ?? 0,
    // Wie stark muss fuer 1600x900 hochgerechnet werden? Unter 1 heisst:
    // Das Bild wird sogar verkleinert, es geht nichts verloren.
    vergroesserung: BREITE / Math.min(m.width ?? 1, Math.round((m.height ?? 1) * (16 / 9))),
  };
}

const SYSTEM =
  "Du bist Bildredaktion eines deutschsprachigen Gaming-Magazins und waehlst das Aufmacherbild fuer einen Artikel. Format 16:9, ueber dem Bild liegt KEIN Text. Du antwortest ausschliesslich mit JSON.";

async function beurteile({ kandidaten, titel, spiel, jahr }) {
  const inhalt = [];
  for (const [i, k] of kandidaten.entries()) {
    inhalt.push({ type: "text", text: `Bild ${i + 1} (${k.herkunft}):` });
    inhalt.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: (await sharp(k.vorschau).resize(800).jpeg({ quality: 78 }).toBuffer()).toString("base64"),
      },
    });
    inhalt.push({
      type: "text",
      text: `   (Quelle ${k.breite}x${k.hoehe} px, muss ${k.vergroesserung.toFixed(2)}x hochgerechnet werden - unter 1.0 heisst verlustfrei)`,
    });
  }
  inhalt.push({
    type: "text",
    text: `Das sind ${kandidaten.length} Bildvorschlaege fuer EINEN Artikel, bereits im fertigen Format 16:9.

SCHLAGZEILE: "${titel}"
SPIEL: ${spiel}${jahr ? `\nDAS SPIEL ERSCHIEN URSPRUENGLICH: ${jahr}` : ""}

Beurteile nach vier Kriterien:
1. SUJET: Passt das Motiv zur Schlagzeile?
2. WIRKUNG: Stoppt das Bild als Aufmacher den Blick? Klare Motive und Gesichter ja, matschige Wimmelbilder nein.
3. BILDGUETE: Sieht es aus, als koennte es heute von einem Premium-Magazin stammen? Ausschlussgruende: sichtbar veraltete Grafik, Sprite- oder Pixeloptik, weichgezeichnete oder hochskalierte Bilder, Kompressionsartefakte. Bekanntheit ersetzt keine Bildguete.
4. AUFLOESUNG: Bei zwei gleichwertigen Bildern gewinnt das mit der kleineren Hochrechnung.

Antworte NUR mit JSON, erstes Zeichen "{":
{"bestes": 1, "begruendung": "ein Satz", "pruefung": {"grafikAktuell": true, "schriftzugUnbeschnitten": true}}
Taugt keines: {"bestes": null, "begruendung": "ein Satz"}`,
  });

  const urteil = parseJsonResponse(
    await askClaude({ system: SYSTEM, content: inhalt, maxTokens: 4000, model: MODELL_URTEIL }),
  );
  if (!urteil.bestes) return { gewaehlt: null, grund: urteil.begruendung };
  const durchgefallen = [
    urteil.pruefung?.grafikAktuell !== true && "Grafik sieht veraltet aus",
    urteil.pruefung?.schriftzugUnbeschnitten !== true && "Schriftzug angeschnitten",
  ].filter(Boolean);
  if (durchgefallen.length) return { gewaehlt: null, grund: durchgefallen.join("; ") };
  return { gewaehlt: kandidaten[urteil.bestes - 1], grund: urteil.begruendung };
}

for (const slug of slugs) {
  const pfad = join(ROOT, "src", "content", "articles", `${slug}.json`);
  if (!existsSync(pfad)) {
    console.log(`\n--- ${slug}: Artikel nicht gefunden`);
    continue;
  }
  const a = JSON.parse(readFileSync(pfad, "utf8"));
  console.log(`\n--- ${slug}`);
  console.log(`  Titel:   ${a.title}`);
  console.log(`  VORHER:  ${a.image?.credit ?? "kein Bild"} (${a.image?.sourceWidth}x${a.image?.sourceHeight})`);

  // Vorher-Bild in denselben Ordner kopieren, damit beide nebeneinander
  // liegen und ich sie zusammenstellen kann.
  if (a.image?.src) {
    const quelle = join(ROOT, "public", a.image.src);
    if (existsSync(quelle)) {
      await sharp(quelle).jpeg({ quality: 86 }).toFile(join(AUS, `${slug}-vorher.jpg`));
    }
  }

  const spiel = await spielNameFuer(a);
  if (!spiel) {
    console.log("  NACHHER: kein einzelnes Spiel - es bliebe beim Quellbild");
    continue;
  }
  console.log(`  Spiel:   ${spiel}`);

  const vorrat = await holeSpielBildKandidaten({
    gameName: spiel,
    rotation: 0,
    anzahl: 6,
    outPrefix: join(tmpdir(), `vgl-${slug}`),
  });
  if (!vorrat) {
    console.log("  NACHHER: kein offizielles Material gefunden - es bliebe beim Quellbild");
    continue;
  }

  const kandidaten = [];
  for (const [i, k] of vorrat.kandidaten.entries()) {
    kandidaten.push({
      ...k,
      ...(await auf169(k.pfad, join(tmpdir(), `vgl169-${slug}-${i}.jpg`))),
    });
  }
  console.log(
    `  Material: ${kandidaten.length} offizielle Kandidaten (${kandidaten.map((k) => `${k.breite}x${k.hoehe}`).join(", ")})`,
  );

  const urteil = await beurteile({
    kandidaten,
    titel: a.title,
    spiel,
    jahr: vorrat.jahr ?? null,
  });
  if (!urteil.gewaehlt) {
    console.log(`  NACHHER: nichts bestanden (${urteil.grund}) - es bliebe beim Quellbild`);
    continue;
  }
  await sharp(urteil.gewaehlt.vorschau).toFile(join(AUS, `${slug}-nachher.jpg`));
  console.log(
    `  NACHHER: Bild: ${urteil.gewaehlt.credit.replace(/^Bild: /, "")} - ${urteil.gewaehlt.herkunft}, ` +
      `${urteil.gewaehlt.breite}x${urteil.gewaehlt.hoehe}, ${urteil.gewaehlt.vergroesserung.toFixed(2)}x`,
  );
  console.log(`  Begruendung: ${urteil.grund}`);
}

console.log("\nBilder liegen unter vergleich/ und haengen am Lauf.");
