// Pixel-Raten — das tägliche Rätsel der Republic (Tim-Freigabe 09.08.2026).
// Wählt jede Nacht ein Spiel aus dem kuratierten Fundus, holt das offizielle
// Artwork über die bestehende Bild-Strecke (Steam → IGDB) und rechnet es in
// FÜNF Schärfe-Stufen herunter (Mosaik: winzig rechnen, grob hochskalieren).
// Ergebnis: src/content/pixelraten.json + public/images/pixelraten/*.jpg —
// beides wird committet, die Komponente auf der Startseite liest es statisch.
// Läuft als Schritt der News-Pipeline; generiert genau EINMAL pro Tag
// (Europe/Zurich), alte Bilder werden nach 3 Tagen aufgeräumt.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { holeSpielBild } from "./lib/keyart.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "pipeline", "state.json");
const OUT_JSON = join(ROOT, "src", "content", "pixelraten.json");
const BILDER_DIR = join(ROOT, "public", "images", "pixelraten");

// Kuratierter Fundus: bekannte, erratbare Spiele quer durch Plattformen und
// Jahrzehnte (bewusst auch deutsche Klassiker für unser Publikum). Hinweise
// sind vor-redigiert: h1 erscheint nach dem 2., h2 nach dem 3. Fehlversuch.
// Aliasse decken gängige Kurzformen ab (Abgleich läuft normalisiert).
const FUNDUS = [
  { n: "The Legend of Zelda: Breath of the Wild", a: ["Zelda Breath of the Wild", "Breath of the Wild", "Zelda BotW", "BotW"], h1: "Erschienen 2017 · Open World", h2: "Nintendo" },
  { n: "The Witcher 3: Wild Hunt", a: ["The Witcher 3", "Witcher 3"], h1: "Erschienen 2015 · Rollenspiel", h2: "CD Projekt Red" },
  { n: "Grand Theft Auto V", a: ["GTA V", "GTA 5"], h1: "Erschienen 2013 · Open World", h2: "Rockstar Games" },
  { n: "Grand Theft Auto: Vice City", a: ["GTA Vice City", "Vice City"], h1: "Erschienen 2002 · Open World", h2: "80er-Jahre-Setting" },
  { n: "Red Dead Redemption 2", a: ["RDR2", "RDR 2", "Red Dead 2"], h1: "Erschienen 2018 · Western", h2: "Rockstar Games" },
  { n: "Elden Ring", a: [], h1: "Erschienen 2022 · Action-RPG", h2: "FromSoftware" },
  { n: "Dark Souls III", a: ["Dark Souls 3"], h1: "Erschienen 2016 · Action-RPG", h2: "FromSoftware" },
  { n: "Bloodborne", a: [], h1: "Erschienen 2015 · Action-RPG", h2: "PlayStation-exklusiv" },
  { n: "Sekiro: Shadows Die Twice", a: ["Sekiro"], h1: "Erschienen 2019 · Action", h2: "Feudales Japan" },
  { n: "God of War", a: ["God of War 2018"], h1: "Erschienen 2018 · Action-Adventure", h2: "Nordische Mythologie" },
  { n: "The Last of Us", a: ["Last of Us", "TLOU"], h1: "Erschienen 2013 · Action-Adventure", h2: "Naughty Dog" },
  { n: "Uncharted 4: A Thief's End", a: ["Uncharted 4"], h1: "Erschienen 2016 · Action-Adventure", h2: "Schatzsucher" },
  { n: "Horizon Zero Dawn", a: ["Horizon"], h1: "Erschienen 2017 · Open World", h2: "Maschinen-Dinos" },
  { n: "Ghost of Tsushima", a: [], h1: "Erschienen 2020 · Open World", h2: "Samurai" },
  { n: "Cyberpunk 2077", a: ["Cyberpunk"], h1: "Erschienen 2020 · Open World", h2: "CD Projekt Red" },
  { n: "The Elder Scrolls V: Skyrim", a: ["Skyrim"], h1: "Erschienen 2011 · Rollenspiel", h2: "Bethesda" },
  { n: "Fallout 4", a: [], h1: "Erschienen 2015 · Rollenspiel", h2: "Endzeit" },
  { n: "Minecraft", a: [], h1: "Erschienen 2011 · Sandbox", h2: "Klötzchen" },
  { n: "Half-Life 2", a: ["Half Life 2"], h1: "Erschienen 2004 · Shooter", h2: "Valve" },
  { n: "Portal 2", a: [], h1: "Erschienen 2011 · Puzzle", h2: "Valve" },
  { n: "DOOM Eternal", a: ["Doom Eternal"], h1: "Erschienen 2020 · Shooter", h2: "Höllen-Dämonen" },
  { n: "Counter-Strike 2", a: ["CS2", "CS 2", "Counter Strike 2"], h1: "Erschienen 2023 · Taktik-Shooter", h2: "Valve" },
  { n: "Baldur's Gate 3", a: ["Baldurs Gate 3", "BG3"], h1: "Erschienen 2023 · Rollenspiel", h2: "Larian Studios" },
  { n: "Diablo IV", a: ["Diablo 4"], h1: "Erschienen 2023 · Action-RPG", h2: "Blizzard" },
  { n: "Overwatch 2", a: ["Overwatch"], h1: "Erschienen 2022 · Hero-Shooter", h2: "Blizzard" },
  { n: "StarCraft II", a: ["StarCraft 2"], h1: "Erschienen 2010 · Echtzeit-Strategie", h2: "Blizzard" },
  { n: "Hollow Knight", a: [], h1: "Erschienen 2017 · Metroidvania", h2: "Käfer-Ritter" },
  { n: "Celeste", a: [], h1: "Erschienen 2018 · Plattformer", h2: "Berg-Besteigung" },
  { n: "Stardew Valley", a: ["Stardew"], h1: "Erschienen 2016 · Farm-Simulation", h2: "Pixel-Landleben" },
  { n: "Terraria", a: [], h1: "Erschienen 2011 · Sandbox", h2: "2D-Graben" },
  { n: "Subnautica", a: [], h1: "Erschienen 2018 · Survival", h2: "Unterwasser" },
  { n: "Cuphead", a: [], h1: "Erschienen 2017 · Run and Gun", h2: "Cartoon-Stil der 1930er" },
  { n: "Hades", a: [], h1: "Erschienen 2020 · Roguelike", h2: "Griechische Unterwelt" },
  { n: "It Takes Two", a: [], h1: "Erschienen 2021 · Koop-Adventure", h2: "Nur zu zweit spielbar" },
  { n: "Valheim", a: [], h1: "Erschienen 2021 · Survival", h2: "Wikinger" },
  { n: "Kingdom Come: Deliverance", a: ["Kingdom Come"], h1: "Erschienen 2018 · Rollenspiel", h2: "Mittelalter-Böhmen" },
  { n: "Metro Exodus", a: [], h1: "Erschienen 2019 · Shooter", h2: "Russische Endzeit" },
  { n: "No Man's Sky", a: ["No Mans Sky"], h1: "Erschienen 2016 · Weltraum", h2: "18 Trillionen Planeten" },
  { n: "Death Stranding", a: [], h1: "Erschienen 2019 · Action", h2: "Hideo Kojima" },
  { n: "Control", a: [], h1: "Erschienen 2019 · Action", h2: "Remedy" },
  { n: "Resident Evil 4", a: ["RE4"], h1: "Remake 2023 · Survival-Horror", h2: "Capcom" },
  { n: "Monster Hunter: World", a: ["Monster Hunter World"], h1: "Erschienen 2018 · Action-RPG", h2: "Capcom" },
  { n: "NieR: Automata", a: ["Nier Automata"], h1: "Erschienen 2017 · Action-RPG", h2: "Androidin 2B" },
  { n: "Persona 5 Royal", a: ["Persona 5"], h1: "Erschienen 2019 · JRPG", h2: "Phantomdiebe" },
  { n: "Halo Infinite", a: ["Halo"], h1: "Erschienen 2021 · Shooter", h2: "Master Chief" },
  { n: "Forza Horizon 5", a: ["Forza Horizon"], h1: "Erschienen 2021 · Rennspiel", h2: "Mexiko" },
  { n: "Age of Empires II", a: ["Age of Empires 2", "AoE 2", "AoE2"], h1: "Erschienen 1999 · Echtzeit-Strategie", h2: "Wololo" },
  { n: "Cities: Skylines", a: ["Cities Skylines"], h1: "Erschienen 2015 · Städtebau", h2: "Verkehrsplanung" },
  { n: "Anno 1800", a: [], h1: "Erschienen 2019 · Aufbau-Strategie", h2: "Industrialisierung" },
  { n: "Gothic II", a: ["Gothic 2"], h1: "Erschienen 2002 · Rollenspiel", h2: "Deutscher Kult-Klassiker" },
  { n: "Mass Effect 2", a: [], h1: "Erschienen 2010 · Sci-Fi-RPG", h2: "Commander Shepard" },
  { n: "BioShock Infinite", a: ["Bioshock Infinite"], h1: "Erschienen 2013 · Shooter", h2: "Stadt in den Wolken" },
  { n: "Borderlands 3", a: ["Borderlands"], h1: "Erschienen 2019 · Loot-Shooter", h2: "Cel-Shading" },
  { n: "Apex Legends", a: ["Apex"], h1: "Erschienen 2019 · Battle Royale", h2: "Respawn" },
  { n: "Rocket League", a: [], h1: "Erschienen 2015 · Sport", h2: "Autos spielen Fussball" },
  { n: "Slay the Spire", a: [], h1: "Erschienen 2019 · Deckbuilder", h2: "Roguelike-Karten" },
  { n: "Balatro", a: [], h1: "Erschienen 2024 · Deckbuilder", h2: "Poker-Joker" },
  { n: "Helldivers 2", a: ["Helldivers II"], h1: "Erschienen 2024 · Koop-Shooter", h2: "Demokratie verbreiten" },
  { n: "Lies of P", a: [], h1: "Erschienen 2023 · Action-RPG", h2: "Pinocchio" },
  { n: "Sea of Thieves", a: [], h1: "Erschienen 2018 · Piraten", h2: "Rare" },
];

const zuerichTag = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(d);

const normalisiert = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

// Schon ein Rätsel für heute? Dann ist nichts zu tun.
let bestehend = null;
try {
  bestehend = JSON.parse(readFileSync(OUT_JSON, "utf8"));
} catch {
  // erste Ausführung
}
if (bestehend?.datum === zuerichTag()) {
  console.log(`Pixel-Raten: Rätsel für ${bestehend.datum} existiert (#${bestehend.nummer}).`);
  process.exit(0);
}

const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
state.pixelraten ??= { nummer: 0, benutzt: [] };

// Auswahl: zufällig aus den noch nicht benutzten; ist der Fundus einmal
// durch, beginnt die Rotation von vorn.
let offen = FUNDUS.filter((s) => !state.pixelraten.benutzt.includes(s.n));
if (offen.length === 0) {
  state.pixelraten.benutzt = [];
  offen = [...FUNDUS];
}

// Mehrere Ziehungen erlauben, falls ein Spiel kein Artwork liefert.
let spiel = null;
let rohBild = null;
for (let versuch = 0; versuch < 5 && !spiel; versuch++) {
  const kandidat = offen[Math.floor(Math.random() * offen.length)];
  const tmp = join(tmpdir(), `rop-pixelraten-${Date.now()}.jpg`);
  // Rotation 1 = erster SCREENSHOT statt Cover: Cover tragen den Titel-
  // Schriftzug und verraten die Lösung ab Stufe 3 (Test 09.08.2026).
  // Hat ein Spiel nur Cover (Pool 1), liefert das Modulo trotzdem eines.
  const bild = await holeSpielBild({ gameName: kandidat.n, rotation: 1, outPath: tmp });
  if (bild) {
    spiel = kandidat;
    rohBild = tmp;
  } else {
    console.log(`  ${kandidat.n}: kein Artwork — nächste Ziehung`);
    offen = offen.filter((s) => s !== kandidat);
  }
}
if (!spiel) {
  console.error("Pixel-Raten: kein Kandidat mit Artwork gefunden — Rätsel bleibt das gestrige.");
  process.exit(0);
}

// Schärfe-Stufen als Mosaik: winzig herunterrechnen, grob hochskalieren.
// Die LETZTE Stufe ist bewusst voll scharf (Fix 09.08.2026, Tims
// Beobachtung): Sie erscheint erst im fünften und letzten Versuch — dort
// gehört eine faire Chance hin. Der frühere Grund fürs Weichzeichnen
// (Titel-Schriftzug auf Cover-Artworks) entfiel mit der Umstellung auf
// Screenshots.
mkdirSync(BILDER_DIR, { recursive: true });
const datum = zuerichTag();
// SCHWIERIGKEIT GELOCKERT (Tim, 12.08.2026): "Es ist zu schwer, lockere es
// ein wenig auf. Es soll nach wie vor nicht einfach sein, aber auch nicht so
// schwer." Vorher [14, 22, 34, 54] — die erste Stufe zeigte das Bild in
// 14 Pixel Breite, was praktisch nur Farbflächen übrig liess und den ersten
// Versuch zum Raten machte. Jetzt beginnt es bei 24 Pixeln: Umrisse und
// grobe Formen sind erkennbar, Details noch nicht. Die Abstände zwischen den
// Stufen bleiben ähnlich gross, damit jeder Fehlversuch spürbar mehr zeigt.
const MOSAIK_STUFEN = [24, 34, 48, 68];
const bilder = [];
for (let i = 0; i < MOSAIK_STUFEN.length; i++) {
  const w = MOSAIK_STUFEN[i];
  const h = Math.round(w * 1.25);
  const winzig = await sharp(rohBild).resize(w, h, { fit: "cover" }).toBuffer();
  const rel = `/images/pixelraten/${datum}-s${i + 1}.jpg`;
  await sharp(winzig, { failOn: "none" })
    .resize(648, 810, { kernel: "nearest" })
    .jpeg({ quality: 82 })
    .toFile(join(ROOT, "public", rel));
  bilder.push(rel);
}
const relScharf = `/images/pixelraten/${datum}-s${MOSAIK_STUFEN.length + 1}.jpg`;
await sharp(rohBild)
  .resize(648, 810, { fit: "cover" })
  .jpeg({ quality: 88 })
  .toFile(join(ROOT, "public", relScharf));
bilder.push(relScharf);

// Alte Rätsel-Bilder aufräumen (3 Tage Behalt).
const behalteAb = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
for (const f of readdirSync(BILDER_DIR)) {
  if (f.slice(0, 10) < behalteAb) unlinkSync(join(BILDER_DIR, f));
}

state.pixelraten.nummer += 1;
state.pixelraten.benutzt.push(spiel.n);

writeFileSync(
  OUT_JSON,
  JSON.stringify(
    {
      datum,
      nummer: state.pixelraten.nummer,
      loesung: spiel.n,
      akzeptiert: [normalisiert(spiel.n), ...spiel.a.map(normalisiert)],
      hinweise: [spiel.h1, spiel.h2],
      bilder,
    },
    null,
    2
  ) + "\n"
);

// State mergen wie üblich (run.mjs/instagram.mjs schreiben ihn auch).
const aktuell = JSON.parse(readFileSync(STATE_FILE, "utf8"));
aktuell.pixelraten = state.pixelraten;
writeFileSync(STATE_FILE, JSON.stringify(aktuell, null, 2) + "\n");

console.log(`Pixel-Raten: Rätsel #${state.pixelraten.nummer} für ${datum} erzeugt (Lösung intern: ${spiel.n}).`);
