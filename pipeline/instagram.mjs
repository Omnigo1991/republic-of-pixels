// Instagram-Autoposting von Republic of Pixels (Konzept-Freigabe 07.08.2026).
//
// Zwei Phasen im selben Workflow-Lauf (Steps teilen sich den Workspace):
//   node pipeline/instagram.mjs prepare   — VOR dem Commit:
//     Kandidaten bestimmen (Kontingent, Zeitfenster, Breaking-Ausnahme),
//     IG-Texte via Claude (Headline-Zeilen mit Cyan-Wörtern, Caption,
//     max. 5 Hashtags), Post-Grafik rendern (public/social/, wird mit
//     committet und von Vercel gehostet), State fortschreiben und die
//     Publish-Aufträge nach .ig-queue.json (gitignored) legen.
//   node pipeline/instagram.mjs publish   — NACH dem Push:
//     warten, bis die Grafik auf der Produktion erreichbar ist (Vercel-
//     Deploy), dann Container erstellen und veröffentlichen.
//
// Posting-Regeln (Tim, 08.08.2026): Soll 5 Posts/Tag entlang einer
// Tageskurve (9–21 Uhr, Europe/Zurich), Deckel 6, Breaking wird immer
// sofort gepostet (bis zum Deckel). Läuft der Tag hinter dem Soll, holt
// ein Lauf bis zu 2 Posts nach. Feed-Posts verweisen auf den Link in der
// Bio; ein Fehlschlag hier darf NIE den Artikel-Publish blockieren.
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { askClaude, parseJsonResponse } from "./lib/claude.mjs";
import { renderInstagramCard } from "./lib/instagram-card.mjs";
import { renderInstagramReel } from "./lib/instagram-reel.mjs";
import { renderTypoCard } from "./lib/instagram-typo.mjs";
import { holeSpielBild } from "./lib/keyart.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "pipeline", "state.json");
const QUEUE_FILE = join(ROOT, ".ig-queue.json");
// Fehlgeschlagene Publishes (09.08.2026, "API access blocked"-Vorfall):
// publish schreibt sie hierhin, der Workflow-Schritt "entsperren" gibt die
// Slots via pipeline/ig-unmark.mjs zurück — sonst verbrennt jeder Ausfall
// einen Tages-Slot (optimistische Markierung gegen Doppelposts).
const FAILED_FILE = join(ROOT, ".ig-failed.json");
const ARTICLES_DIR = join(ROOT, "src", "content", "articles");
const SOCIAL_DIR = join(ROOT, "public", "social");
const SITE = "https://www.republicofpixels.com";
const IG_API = "https://graph.instagram.com/v23.0";

// Tim, 08.08.2026 abends: Anspruch sind 5 Posts/Tag — der alte Grundtakt 3
// war zu defensiv. Der Deckel (inkl. Breaking) liegt eine Stufe darüber.
const BASE_PER_DAY = 5;
const CAP_PER_DAY = 6;
const QUIET_BEFORE = 9; // Nicht-Breaking erst ab 9 Uhr …
const QUIET_AFTER = 21; // … und bis 21 Uhr (Europe/Zurich)
const CANDIDATE_WINDOW_H = 18;
const CARD_RETENTION_DAYS = 3;

const zurich = (date = new Date()) => ({
  day: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(
    date,
  ),
  // parseInt statt Number: de-CH formatiert Stunden als "20 Uhr".
  hour: parseInt(
    new Intl.DateTimeFormat("de-CH", {
      timeZone: "Europe/Zurich",
      hour: "numeric",
      hourCycle: "h23",
    }).format(date),
    10,
  ),
});

function loadState() {
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  state.instagram ??= { posted: {}, cards: {} };
  state.instagram.posted ??= {};
  state.instagram.cards ??= {};
  return state;
}

function loadArticles() {
  const out = [];
  for (const f of readdirSync(ARTICLES_DIR).filter((f) =>
    f.endsWith(".json"),
  )) {
    try {
      out.push(JSON.parse(readFileSync(join(ARTICLES_DIR, f), "utf8")));
    } catch {
      // defekte Datei ignorieren
    }
  }
  return out;
}

// ---------- Phase 1: prepare ----------

const IG_SYSTEM = `Du bist die Social-Media-Redaktion von Republic of Pixels, einem deutschsprachigen Gaming-Magazin, und schreibst Instagram-Posts mit einem Ziel: maximale Aufmerksamkeit und Interaktion, ohne die redaktionelle Glaubwürdigkeit zu opfern. Zuspitzen ja, lügen nie — jeder Hook muss vom Artikel gedeckt sein. Sprache: Deutsch in SCHWEIZER Rechtschreibung — NIEMALS "ß", immer "ss". Keine Emojis in Headlines. "Republic of Pixels" nie mit Bindestrichen verbinden.`;

async function pickAndWriteCopy(candidates, maxPicks) {
  const list = candidates
    .map(
      (a, i) =>
        `${i} | ${a.category} | ${a.title} | Tags: ${(a.tags ?? []).join(", ")} | ${a.excerpt}`,
    )
    .join("\n");

  const prompt = `Kandidaten für Instagram-Posts (Format: Index | Kategorie | Titel | Tags | Teaser):

${list}

Wähle die ${maxPicks} zugkräftigsten Kandidaten für Instagram aus (grosse Namen und starke Pointen zuerst). Der Redaktionsplan BRAUCHT diese Posts — wähle nur dann weniger, wenn ein Kandidat redaktionell unhaltbar wäre (reines Duplikat einer schon gewählten Story, gar keine echte Neuigkeit). "Nur solide" ist KEIN Ablehnungsgrund: dann nimmst du den stärksten verfügbaren und machst per Zuspitzung das Beste daraus. PFLICHT: Kandidaten der Kategorie "breaking" wählst du IMMER aus. Erstelle pro Auswahl die Post-Texte.

Regeln für "headlineLines" (die Schlagzeile auf der Post-Grafik):
- 2–3 Zeilen, gesamthaft maximal 9 Wörter, zugespitzt auf die Kern-Pointe
- Jede Zeile ist ein Array von Segmenten {"text": "...", "cyan": true/false}
- Maximal 2 Cyan-Segmente pro Post (bevorzugt Spielname und die Pointe/Zahl)
- Die Zeilen müssen optisch ausbalanciert sein: keine Zeile deutlich kürzer als ihre Nachbarn (keine 2-Wort-Zeile zwischen langen Zeilen)
- Keine Anführungszeichen um die ganze Headline

Regeln für "caption" (Stimme: leidenschaftlicher Gaming-Account mit Puls — nicht Pressemitteilung; Ziel bleibt Neugier → Website-Besuch; Reihenfolge zwingend):
1. HOOK als erste Zeile (max. ~100 Zeichen): emotional und zugespitzt, MIT 1–2 passenden Emojis (🔥 😔 👀 🚨 🤯 …) — Instagram schneidet nach ~125 Zeichen ab. Der Hook öffnet eine Wissenslücke, die erst der Artikel schliesst.
2. Dann 2–4 kurze FAKTEN-ZEILEN ALS EMOJI-BULLETS: Jede Zeile beginnt mit einem thematisch passenden Emoji (📉 📸 🛠️ 💰 📅 ⚔️ 🎮 …) und bringt einen knackigen Fakt. Spannung erhöhen — das interessanteste Detail (Begründung, Konsequenz, Überraschung) bleibt bewusst im Artikel.
3. NEUGIER-BRÜCKE: ein kurzer Satz, der konkret benennt, WAS im Artikel wartet, ohne es zu spoilern — 👀 am Ende erlaubt.
4. Dann EINE kurze Engagement-Frage an die Community (Kommentare sind das stärkste Algorithmus-Signal) — konkret zur Story, nie generisch, direkt in der "ihr"-Form.
5. Abschluss exakt: "👉 Ganzer Artikel über den Link in der Bio."
Emojis gesamt 4–8, als visuelle Struktur — kein Spam, keine Emoji-Ketten mitten im Satz.
GRENZE: Zuspitzen und Spannung ja — aber der Artikel MUSS liefern, was die Caption verspricht. Kein "Du glaubst nie…"-Clickbait, keine falschen Versprechen; bei ernsten Themen (Entlassungen, Schicksale) gedämpfte Emojis (😔 statt 🔥) und kein reisserischer Ton. Verboten bleiben: "markiere 3 Freunde", Follow-Aufrufe.

Regeln für "hashtags": EXAKT 5, CamelCase, ohne #-Zeichen im JSON, nach diesem Mix (Reichweite × Auffindbarkeit):
- 1× gross/generisch: Gaming oder GamingNews
- 1× deutschsprachige Community: GamingDeutschland, Zocken oder GamerDeutschland
- 2× themenspezifisch aus den Tags (Spielname zuerst, z. B. GTA6, PS5, NintendoSwitch2)
- 1× RepublicOfPixels (Marke, immer)

Zusätzlich pro Pick: "gameName" = der exakte offizielle Titel des Spiels, um das sich die Story dreht (für die Key-Art-Suche, z. B. "Gothic 1 Remake", "Lies of P") — oder null, wenn die Story kein einzelnes Spiel betrifft (Firmen-News, Hardware, Personalien).

Und pro Pick: "bildWahl" — die redaktionelle Bild-Entscheidung:
- "pressebild": Die Story dreht sich um etwas visuell Konkretes, das die Leser SEHEN wollen (neuer Trailer, erste Screenshots, Charakter-/Map-Enthüllung, eine bestimmte Person) → der Post zeigt das Bild aus der News.
- "keyart": Allgemeine Meldung (Preis, Termin, Verkaufszahlen, Update-Pläne, Studio-News) → der Post zeigt offizielles Spiel-Artwork.

Antworte NUR mit JSON, erstes Zeichen "{":
{"picks":[{"index":0,"gameName":"... oder null","bildWahl":"keyart oder pressebild","headlineLines":[[{"text":"...","cyan":false}]],"caption":"...","hashtags":["..."]}]}
KRITISCH — striktes JSON: Zeilenumbrüche in der Caption IMMER als \\n escapen (niemals ein roher Zeilenumbruch innerhalb eines Strings), Anführungszeichen im Text als \\" — sonst ist die Antwort unbrauchbar.
Nur wenn ein Kandidat redaktionell unhaltbar ist, darf er fehlen; im Extremfall: {"picks":[]}`;

  // Drei Versuche: Am 08.08.2026 kosteten kaputte JSON-Antworten (rohe
  // Zeilenumbrüche in Caption-Strings) trotz einmaligem Retry mehrere
  // Tages-Slots. Der Parser repariert das inzwischen selbst; die Versuche
  // hier fangen den Rest ab (leere Antworten, API-Schluckauf). Scheitert
  // alles, wird ohne Posts fortgefahren (State/Aufräumen laufen weiter)
  // und der Lauf hinterlässt eine sichtbare Warnung in GitHub Actions.
  for (let versuch = 0; ; versuch++) {
    let raw = "";
    try {
      raw = await askClaude({ system: IG_SYSTEM, prompt, maxTokens: 2500 });
      const picks = parseJsonResponse(raw).picks ?? [];
      const brauchbar = picks.filter(
        (p) =>
          candidates[p.index] &&
          Array.isArray(p.headlineLines) &&
          p.headlineLines.length >= 1 &&
          typeof p.caption === "string",
      );
      if (brauchbar.length < picks.length) {
        console.log(
          `  ${picks.length - brauchbar.length} Pick(s) an der Struktur-Prüfung gescheitert.`,
        );
      }
      if (brauchbar.length === 0) {
        console.log(
          `  Auswahl leer: Claude hat trotz ${candidates.length} Kandidaten keinen gewählt.`,
        );
        console.log(
          `::warning::Instagram: Auswahl leer trotz Kandidaten — Slot möglicherweise verloren.`,
        );
      }
      return brauchbar;
    } catch (err) {
      const kopf = raw.replace(/\s+/g, " ").slice(0, 160);
      if (versuch >= 2) {
        console.log(
          `  IG-Auswahl endgültig fehlgeschlagen (${err.message}) — dieser Lauf postet nicht.`,
        );
        if (kopf) console.log(`  Antwortbeginn war: "${kopf}…"`);
        console.log(
          `::warning::Instagram: Auswahl 3x gescheitert (${err.message}) — dieser Lauf postet nicht.`,
        );
        return [];
      }
      console.log(
        `  IG-Auswahl fehlgeschlagen (${err.message}) — Wiederholung`,
      );
    }
  }
}

function portraitPathFor(article) {
  if (!article.image?.src) return null;
  const rel = article.image.src.replace(/\.webp$/, "-portrait.webp");
  const abs = join(ROOT, "public", rel);
  if (existsSync(abs)) return abs;
  // Fallback für Artikel, deren Bild vor der Portrait-Erweiterung entstand:
  // das 16:9-Bild (weniger scharf im 4:5-Zuschnitt, aber funktional).
  const abs169 = join(ROOT, "public", article.image.src);
  return existsSync(abs169) ? abs169 : null;
}

async function prepare() {
  const state = loadState();
  const { day, hour } = zurich();

  // Tageszähler für den Reel/Bild-Wechsel der normalen Posts.
  if (state.instagram.wechsel?.day !== day) {
    state.instagram.wechsel = { day, nichtBreaking: 0 };
  }

  const postedToday = Object.values(state.instagram.posted).filter(
    (iso) => zurich(new Date(iso)).day === day,
  ).length;

  const cutoff = Date.now() - CANDIDATE_WINDOW_H * 3600000;
  // Kandidaten: alle frischen, noch nicht geposteten Artikel mit Bild.
  // Der Qualitäts-Wächter greift erst bei der Bild-Auflösung im Loop —
  // ein Artikel mit schwachem Pressebild kann trotzdem posten, wenn es
  // offizielle Key Art gibt (Tims Bild-Hierarchie, 08.08.2026).
  const fresh = loadArticles().filter(
    (a) =>
      new Date(a.publishedAt).getTime() > cutoff &&
      !state.instagram.posted[a.slug] &&
      // Einmal am Bild gescheitert = raus aus der Auswahl: Sonst kann
      // dieselbe unpostbare Story in jedem Lauf erneut gewählt werden
      // und frisst mehrere Tages-Slots (Lücke entdeckt 08.08.2026).
      !state.instagram.uebersprungen?.[a.slug] &&
      a.image?.src,
  );

  const breaking = fresh.filter((a) => a.category === "breaking");
  const regular = fresh.filter((a) => a.category !== "breaking");

  const slots = [];
  // Breaking geht immer, bis zum Tagesdeckel.
  slots.push(...breaking.slice(0, Math.max(0, CAP_PER_DAY - postedToday)));
  // Nicht-Breaking: nur im Zeitfenster, gesteuert über eine Soll-Kurve
  // (Umbau 08.08.2026, nachdem verlorene Läufe den Tag auf 2 Posts drückten):
  // Der Tag soll 5 Posts gleichmässig über 9–21 Uhr verteilen. Jeder Lauf
  // postet so viele, wie ihm die Kurve zugesteht — normal 1, bei Rückstand
  // (z. B. nach einem gescheiterten Lauf) bis zu 2 zum Aufholen. Die
  // Publish-Phase hält zwischen zwei Posts bewusst Abstand.
  const inWindow = hour >= QUIET_BEFORE && hour < QUIET_AFTER;
  const nonBreakingBudget = Math.max(
    0,
    BASE_PER_DAY - postedToday - slots.length,
  );
  const sollBisJetzt =
    hour >= 19
      ? 5
      : hour >= 17
        ? 4
        : hour >= 15
          ? 3
          : hour >= 12
            ? 2
            : hour >= 9
              ? 1
              : 0;
  const rueckstand = Math.max(
    0,
    Math.min(sollBisJetzt, BASE_PER_DAY) - postedToday - slots.length,
  );
  const maxRegular = inWindow
    ? Math.min(nonBreakingBudget, Math.min(2, rueckstand))
    : 0;

  const candidates = [...slots, ...regular];
  const maxPicks = slots.length + maxRegular;
  if (candidates.length === 0 || maxPicks === 0) {
    console.log(
      `Instagram: keine Posts geplant (heute ${postedToday} gepostet, Soll bis jetzt ${sollBisJetzt}, ${fresh.length} frische Artikel, Fenster ${inWindow ? "offen" : "zu"}).`,
    );
    writeFileSync(
      QUEUE_FILE,
      JSON.stringify({ token: null, posts: [] }) + "\n",
    );
    return;
  }

  console.log(
    `Instagram: bis zu ${maxPicks} Post(s) aus ${candidates.length} Kandidaten …`,
  );

  const { chromium } = await import("playwright");
  const queue = [];
  // Ersatz-Runden (09.08.2026, nach dem 10:03-Lauf): Scheitert ein
  // gewählter Kandidat an der Bild-Prüfung, verfiel vorher der ganze
  // Slot — der Lauf fragt jetzt mit den übrigen Kandidaten nach, bis das
  // Kontingent steht oder der Pool leer ist (max. 3 Auswahl-Runden).
  const bereitsVersucht = new Set();
  for (let runde = 0; runde < 3 && queue.length < maxPicks; runde++) {
    const pool = candidates.filter((a) => !bereitsVersucht.has(a.slug));
    if (pool.length === 0) break;
    const offen = maxPicks - queue.length;
    if (runde > 0) {
      console.log(
        `Instagram: Ersatz-Runde ${runde} — ${offen} Slot(s) offen, ${pool.length} Kandidaten übrig.`,
      );
    }
    const picks = await pickAndWriteCopy(pool, offen);
    if (picks.length === 0) break;

    // Beim Kürzen aufs Kontingent haben Breaking-Picks immer Vorrang.
    picks.sort((a, b) => {
      const ab = pool[a.index]?.category === "breaking" ? 0 : 1;
      const bb = pool[b.index]?.category === "breaking" ? 0 : 1;
      return ab - bb;
    });

    for (const pick of picks.slice(0, offen)) {
      const article = pool[pick.index];
      bereitsVersucht.add(article.slug);

      // Bild-Wahl (Tim, 08.08.2026 — redaktionell statt starrer Rangfolge):
      // Claude entscheidet pro Story, ob die Leser das NEWS-Bild sehen wollen
      // (Trailer, Screenshots, Personen → "pressebild") oder offizielles
      // Spiel-Artwork passt ("keyart"). Darunter bleiben die Netze: Qualitäts-
      // Wächter (>=900px Quellhöhe) für Pressebilder, Steam-Pool mit Rotation
      // pro Spiel gegen Bild-Wiederholung, und die jeweils andere Quelle als
      // Fallback. Nichts Scharfes → kein Post.
      const presseTauglich =
        article.image?.sourceHeight != null &&
        article.image.sourceHeight >= 900;
      let imagePath = null;
      let credit = article.image?.credit ?? null;

      if (pick.bildWahl === "pressebild" && presseTauglich) {
        imagePath = portraitPathFor(article);
        console.log(
          `  ${article.slug}: redaktionelle Wahl Pressebild (${credit})`,
        );
      }
      if (!imagePath && pick.gameName) {
        state.instagram.spielBild ??= {};
        const rotation =
          state.instagram.spielBild[pick.gameName.toLowerCase()] ?? 0;
        const spielBild = await holeSpielBild({
          gameName: pick.gameName,
          rotation,
          outPath: join(tmpdir(), `rop-keyart-${article.slug}.jpg`),
        });
        if (spielBild) {
          imagePath = spielBild.pfad;
          credit = spielBild.credit;
          state.instagram.spielBild[pick.gameName.toLowerCase()] = rotation + 1;
          console.log(
            `  ${article.slug}: offizielles Spielbild ${rotation % spielBild.poolGroesse} (${spielBild.credit})`,
          );
        }
      }
      if (!imagePath && presseTauglich) {
        imagePath = portraitPathFor(article);
      }
      // Letzte Stufe (Tim-Freigabe 09.08.2026): Typo-Karte — reines
      // Marken-Design für starke Storys ohne brauchbares Bild (Hardware/
      // Branche/Personalien). Immer als BILD gepostet (kein Ken-Burns auf
      // Typografie) und ohne Einfluss auf den Reel/Bild-Wechsel.
      //
      // HÖCHSTENS EINE PRO TAG (Nachbesserung 09.08. abends): Am ersten
      // Tag landeten zwei Typo-Karten direkt hintereinander im Feed — sie
      // sehen einander sehr ähnlich und lassen das Profil eintönig wirken.
      // Ist das Tageskontingent weg, wird die Story übersprungen und der
      // Lauf holt sich per Ersatz-Runde eine mit echtem Bildmaterial.
      const alsTypoKarte = !imagePath;
      state.instagram.typo ??= {};
      const typoHeute = Object.values(state.instagram.typo).filter(
        (iso) => zurich(new Date(iso)).day === day,
      ).length;
      if (alsTypoKarte && typoHeute >= 1) {
        state.instagram.uebersprungen ??= {};
        state.instagram.uebersprungen[article.slug] = new Date().toISOString();
        console.log(
          `  ${article.slug}: kein Bildmaterial und Typo-Karte heute schon genutzt — übersprungen`,
        );
        continue;
      }
      const badge =
        article.category === "breaking"
          ? "BREAKING"
          : article.category === "reviews"
            ? "REVIEW"
            : null;

      // Format-Regeln (Tim, 08.08.2026):
      // - BREAKING wird IMMER als Reel gepostet und zählt nicht für den
      //   Wechsel (beeinflusst die Reihenfolge der normalen Posts nicht).
      // - Normale Posts wechseln strikt 50/50: Reel, Bild, Reel … (saubere
      //   A/B-Datenpunkte; Tageszähler im State).
      // Schlägt das Reel-Rendering fehl, greift lautlos das Bild — ein Post
      // geht nie verloren.
      const istBreaking = article.category === "breaking";
      let alsReel;
      if (alsTypoKarte) {
        alsReel = false;
      } else if (istBreaking) {
        alsReel = true;
      } else {
        alsReel = state.instagram.wechsel.nichtBreaking % 2 === 0;
        state.instagram.wechsel.nichtBreaking++;
      }
      let cardRel = null;
      if (alsTypoKarte) {
        cardRel = `/social/ig-${article.slug}.jpg`;
        const KICKER = {
          breaking: "BREAKING",
          leaks: "LEAK",
          reviews: "REVIEW",
          news: "GAMING-NEWS",
        };
        try {
          await renderTypoCard({
            headlineLines: pick.headlineLines,
            kicker: KICKER[article.category] ?? "GAMING-NEWS",
            outPath: join(ROOT, "public", cardRel),
            chromium,
          });
          credit = "Republic of Pixels";
          state.instagram.typo[article.slug] = new Date().toISOString();
          console.log(`  ${article.slug}: Typo-Karte (kein Bildmaterial verfügbar)`);
        } catch (err) {
          state.instagram.uebersprungen ??= {};
          state.instagram.uebersprungen[article.slug] = new Date().toISOString();
          console.log(
            `  ${article.slug}: Typo-Karte fehlgeschlagen (${err.message}) — übersprungen und gesperrt`,
          );
          continue;
        }
      }
      if (!cardRel && alsReel) {
        const reelRel = `/social/ig-${article.slug}.mp4`;
        try {
          await renderInstagramReel({
            headlineLines: pick.headlineLines,
            badge,
            imagePath,
            credit,
            outPath: join(ROOT, "public", reelRel),
            chromium,
          });
          cardRel = reelRel;
        } catch (err) {
          console.log(
            `  ${article.slug}: Reel fehlgeschlagen (${err.message}) — Bild-Fallback`,
          );
        }
      }
      if (!cardRel) {
        cardRel = `/social/ig-${article.slug}.jpg`;
        try {
          await renderInstagramCard({
            headlineLines: pick.headlineLines,
            badge,
            imagePath,
            credit,
            outPath: join(ROOT, "public", cardRel),
            chromium,
          });
        } catch (err) {
          console.log(
            `  ${article.slug}: Grafik fehlgeschlagen (${err.message}) — übersprungen`,
          );
          continue;
        }
      }

      const hashtags = (pick.hashtags ?? [])
        .slice(0, 5)
        .map((h) => `#${String(h).replace(/[^\p{L}\p{N}]/gu, "")}`)
        .join(" ");
      const caption = `${pick.caption}\n${hashtags}`.replaceAll("ß", "ss");

      // Alt-Text (Barrierefreiheit + Instagram-Suche, 08.08.2026):
      // beschreibt die Post-Grafik deterministisch aus Headline und
      // Bildnachweis — die API nimmt ihn nur bei Bild-Posts an.
      const headlineText = pick.headlineLines
        .map((zeile) => zeile.map((s) => s.text).join(" "))
        .join(" ");
      const altText =
        `Nachrichtengrafik von Republic of Pixels: «${headlineText}» (${credit ?? "Symbolbild"})`.slice(
          0,
          950,
        );

      queue.push({
        slug: article.slug,
        cardRel,
        caption,
        altText,
        // Für die Slot-Rückgabe bei Publish-Fehlern: nur Posts, die den
        // Wechsel-Zähler erhöht haben (Typo-Karten zählen nicht mit).
        nichtBreaking: !istBreaking && !alsTypoKarte,
      });
      // Optimistisch als gepostet markieren: verhindert Doppel-Posts selbst
      // dann, wenn die Publish-Phase später fehlschlägt (bewusster Trade-off:
      // lieber ein verlorener Post als ein doppelter).
      state.instagram.posted[article.slug] = new Date().toISOString();
      state.instagram.cards[cardRel] = new Date().toISOString();
      console.log(
        `  ✓ Grafik gerendert: ${cardRel}${badge ? ` [${badge}]` : ""}`,
      );
    }
  }

  // Alte Karten aufräumen (Repo schlank halten): gerenderte Grafiken werden
  // nur für den API-Abruf gebraucht und nach ein paar Tagen gelöscht.
  const keepAfter = Date.now() - CARD_RETENTION_DAYS * 86400000;
  for (const [rel, iso] of Object.entries(state.instagram.cards)) {
    if (new Date(iso).getTime() < keepAfter) {
      const abs = join(ROOT, "public", rel);
      if (existsSync(abs)) unlinkSync(abs);
      delete state.instagram.cards[rel];
    }
  }
  // Der einmalige API-Testpost vom 07.08.2026 wird mit aufgeräumt.
  const testShot = join(SOCIAL_DIR, "ig-test-post.jpg");
  if (existsSync(testShot)) unlinkSync(testShot);

  // posted-Einträge älter als 30 Tage vergessen (Artikel fallen ohnehin
  // aus dem Kandidatenfenster).
  const forgetAfter = Date.now() - 30 * 86400000;
  for (const [slug, iso] of Object.entries(state.instagram.posted)) {
    if (new Date(iso).getTime() < forgetAfter)
      delete state.instagram.posted[slug];
  }
  for (const [slug, iso] of Object.entries(
    state.instagram.uebersprungen ?? {},
  )) {
    if (new Date(iso).getTime() < forgetAfter)
      delete state.instagram.uebersprungen[slug];
  }

  // Token-Pflege: Langlebige Instagram-Tokens gelten 60 Tage und werden
  // wöchentlich verlängert. Gibt Instagram dabei einen NEUEN Token-String
  // zurück, wird er im State (privates Repo) fortgeschrieben — das GitHub-
  // Secret dient dann nur noch als Bootstrap. Publish nutzt den State-Token,
  // falls vorhanden (via Queue-Datei, damit die Phase ohne State-Commit
  // auskommt).
  const effectiveToken =
    state.instagram.token?.value ?? process.env.IG_ACCESS_TOKEN;
  const lastCheck = state.instagram.tokenCheckedAt
    ? new Date(state.instagram.tokenCheckedAt).getTime()
    : 0;
  if (effectiveToken && Date.now() - lastCheck > 7 * 86400000) {
    try {
      const res = await fetch(
        `${IG_API.replace("/v23.0", "")}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(effectiveToken)}`,
      );
      const data = await res.json();
      if (res.ok && data.access_token) {
        state.instagram.tokenCheckedAt = new Date().toISOString();
        if (data.access_token !== process.env.IG_ACCESS_TOKEN) {
          state.instagram.token = {
            value: data.access_token,
            expiresAt: new Date(
              Date.now() + (data.expires_in ?? 0) * 1000,
            ).toISOString(),
          };
        }
        console.log(
          "Instagram: Token verlängert (gültig bis " +
            new Date(Date.now() + (data.expires_in ?? 0) * 1000)
              .toISOString()
              .slice(0, 10) +
            ").",
        );
      } else {
        console.log(
          `Instagram: Token-Verlängerung fehlgeschlagen (${data.error?.message ?? res.status}).`,
        );
      }
    } catch (err) {
      console.log(
        `Instagram: Token-Verlängerung fehlgeschlagen (${err.message}).`,
      );
    }
  }

  writeFileSync(
    STATE_FILE,
    JSON.stringify(loadStateMerge(state), null, 2) + "\n",
  );
  writeFileSync(
    QUEUE_FILE,
    JSON.stringify(
      { token: state.instagram.token?.value ?? null, posts: queue },
      null,
      2,
    ) + "\n",
  );
  console.log(`Instagram: ${queue.length} Post(s) vorbereitet.`);
}

// state.json wird auch von run.mjs geschrieben — wir lesen frisch und
// mergen nur unseren instagram-Teil, damit nichts verloren geht.
function loadStateMerge(state) {
  try {
    const current = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    return { ...current, instagram: state.instagram };
  } catch {
    return state;
  }
}

// ---------- Phase 2: publish ----------

async function waitForUrl(url, maxMs = 6 * 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return true;
    } catch {
      // Netzwerkfehler → weiter warten
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  return false;
}

async function igPost(path, params) {
  const res = await fetch(`${IG_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `HTTP ${res.status}`);
  }
  return data;
}

async function publish() {
  let queueData = { token: null, posts: [] };
  try {
    queueData = JSON.parse(readFileSync(QUEUE_FILE, "utf8"));
  } catch {
    // keine Queue-Datei → nichts zu tun
  }
  const token = queueData.token ?? process.env.IG_ACCESS_TOKEN;
  if (!token) {
    console.log("Instagram: kein Zugriffstoken — Publish übersprungen.");
    return;
  }
  if ((queueData.posts ?? []).length === 0) {
    console.log("Instagram: nichts zu publizieren.");
    return;
  }

  const fehlgeschlagen = [];

  for (const [index, item] of queueData.posts.entries()) {
    // Holt ein Lauf mehrere Posts nach (Aufhol-Logik), gehen sie nicht im
    // Sekundentakt raus: 6 Minuten Abstand wirken wie redaktionelle Hand.
    if (index > 0) {
      console.log("Instagram: 6 Minuten Abstand bis zum nächsten Post …");
      await new Promise((r) => setTimeout(r, 6 * 60000));
    }
    const imageUrl = `${SITE}${item.cardRel}`;
    console.log(`Instagram: warte auf ${imageUrl} …`);
    if (!(await waitForUrl(imageUrl))) {
      console.log(
        `  Grafik nicht erreichbar (Deploy zu langsam?) — Post entfällt: ${item.slug}`,
      );
      fehlgeschlagen.push({ slug: item.slug, nichtBreaking: item.nichtBreaking === true });
      continue;
    }
    try {
      const istReel = item.cardRel.endsWith(".mp4");
      const container = await igPost(
        "/me/media",
        istReel
          ? {
              media_type: "REELS",
              video_url: imageUrl,
              caption: item.caption,
              share_to_feed: "true",
              access_token: token,
            }
          : {
              image_url: imageUrl,
              caption: item.caption,
              // alt_text: seit 2025 von der API für Bild-Posts unterstützt
              // (Reels laut Doku uneinheitlich — dort weggelassen).
              ...(item.altText ? { alt_text: item.altText } : {}),
              access_token: token,
            },
      );
      // Container-Verarbeitung abwarten — Videos brauchen deutlich länger
      // als Bilder (Transkodierung durch Instagram, bis zu ~3 Minuten).
      const versuche = istReel ? 36 : 12;
      for (let i = 0; i < versuche; i++) {
        const st = await fetch(
          `${IG_API}/${container.id}?fields=status_code&access_token=${encodeURIComponent(token)}`,
        ).then((r) => r.json());
        if (st.status_code === "FINISHED") break;
        if (st.status_code === "ERROR")
          throw new Error("Container-Verarbeitung fehlgeschlagen");
        await new Promise((r) => setTimeout(r, 5000));
      }
      const published = await igPost("/me/media_publish", {
        creation_id: container.id,
        access_token: token,
      });
      console.log(
        `  ✓ Gepostet (${istReel ? "Reel" : "Bild"}): ${item.slug} (Media-ID ${published.id})`,
      );
    } catch (err) {
      console.log(`  ✗ Post fehlgeschlagen für ${item.slug}: ${err.message}`);
      fehlgeschlagen.push({ slug: item.slug, nichtBreaking: item.nichtBreaking === true });
    }
  }

  if (fehlgeschlagen.length > 0) {
    writeFileSync(FAILED_FILE, JSON.stringify(fehlgeschlagen, null, 2) + "\n");
    console.log(
      `::error::Instagram: ${fehlgeschlagen.length} Post(s) fehlgeschlagen — Slots werden zurückgegeben (ig-unmark).`,
    );
    // Lauf ROT färben (Tims Einwand 09.08.2026: er musste aktiv nachfragen,
    // um den API-Ausfall zu bemerken): Der rote Status löst SOFORT eine
    // GitHub-Mail aus statt erst der Tagesbilanz um 20:15. Gefahrlos, weil
    // die Artikel zu diesem Zeitpunkt längst gepusht sind; der Entsperr-
    // Schritt läuft dank if:always() trotzdem.
    process.exitCode = 1;
  }
}

// ---------- Einstieg ----------

const mode = process.argv[2];
const run = mode === "prepare" ? prepare : mode === "publish" ? publish : null;
if (!run) {
  console.error("Aufruf: node pipeline/instagram.mjs prepare|publish");
  process.exit(1);
}
run().catch((err) => {
  // Instagram darf den Artikel-Publish nie blockieren: Fehler nur loggen.
  console.error(`Instagram-${mode} fehlgeschlagen:`, err.message);
});
