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
// Posting-Regeln (Tim, 07.08.2026): Grundtakt 2–3 Posts/Tag, Deckel 5,
// Breaking wird immer sofort gepostet (bis zum Deckel), Nicht-Breaking nur
// zwischen 9 und 21 Uhr Schweizer Zeit. Feed-Posts verweisen auf den Link
// in der Bio; ein Fehlschlag hier darf NIE den Artikel-Publish blockieren.
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { askClaude, parseJsonResponse } from "./lib/claude.mjs";
import { renderInstagramCard } from "./lib/instagram-card.mjs";
import { renderInstagramReel } from "./lib/instagram-reel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "pipeline", "state.json");
const QUEUE_FILE = join(ROOT, ".ig-queue.json");
const ARTICLES_DIR = join(ROOT, "src", "content", "articles");
const SOCIAL_DIR = join(ROOT, "public", "social");
const SITE = "https://www.republicofpixels.com";
const IG_API = "https://graph.instagram.com/v23.0";

const BASE_PER_DAY = 3;
const CAP_PER_DAY = 5;
const QUIET_BEFORE = 9; // Nicht-Breaking erst ab 9 Uhr …
const QUIET_AFTER = 21; // … und bis 21 Uhr (Europe/Zurich)
const CANDIDATE_WINDOW_H = 18;
const CARD_RETENTION_DAYS = 3;

const zurich = (date = new Date()) => ({
  day: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(date),
  // parseInt statt Number: de-CH formatiert Stunden als "20 Uhr".
  hour: parseInt(
    new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "numeric", hourCycle: "h23" }).format(date),
    10
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
  for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))) {
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
        `${i} | ${a.category} | ${a.title} | Tags: ${(a.tags ?? []).join(", ")} | ${a.excerpt}`
    )
    .join("\n");

  const prompt = `Kandidaten für Instagram-Posts (Format: Index | Kategorie | Titel | Tags | Teaser):

${list}

Wähle die maximal ${maxPicks} zugkräftigsten Kandidaten für Instagram aus (grosse Namen und starke Pointen zuerst; wähle WENIGER oder keinen, wenn kein Kandidat echtes Scroll-Stopp-Potenzial hat). PFLICHT: Kandidaten der Kategorie "breaking" wählst du IMMER aus. Erstelle pro Auswahl die Post-Texte.

Regeln für "headlineLines" (die Schlagzeile auf der Post-Grafik):
- 2–3 Zeilen, gesamthaft maximal 9 Wörter, zugespitzt auf die Kern-Pointe
- Jede Zeile ist ein Array von Segmenten {"text": "...", "cyan": true/false}
- Maximal 2 Cyan-Segmente pro Post (bevorzugt Spielname und die Pointe/Zahl)
- Die Zeilen müssen optisch ausbalanciert sein: keine Zeile deutlich kürzer als ihre Nachbarn (keine 2-Wort-Zeile zwischen langen Zeilen)
- Keine Anführungszeichen um die ganze Headline

Regeln für "caption" (Ziel: maximale Neugier → Website-Besuch; Reihenfolge zwingend):
1. HOOK als erste Zeile (max. ~100 Zeichen): Frage, steile These oder die stärkste Zahl — Instagram schneidet nach ~125 Zeichen ab, die erste Zeile entscheidet über "mehr ansehen". Der Hook öffnet eine Wissenslücke, die erst der Artikel schliesst.
2. Dann 1–2 Sätze Kontext, die die SPANNUNG ERHÖHEN, ohne die Auflösung zu verraten: Das interessanteste Detail (die Begründung, die Konsequenz, das überraschende Zitat) bleibt bewusst im Artikel. Wer nur die Caption liest, muss das Gefühl haben, das Beste noch nicht zu wissen.
3. NEUGIER-BRÜCKE: ein kurzer Satz, der konkret benennt, WAS im Artikel wartet, ohne es zu spoilern (z. B. "Warum ausgerechnet ein Konkurrenzprodukt sein stärkstes Argument ist — steht im Artikel.").
4. Dann EINE kurze Engagement-Frage an die Community (Kommentare sind das stärkste Algorithmus-Signal) — konkret zur Story, nie generisch.
5. Abschluss exakt: "👉 Ganzer Artikel über den Link in der Bio."
GRENZE: Zuspitzen und Spannung ja — aber der Artikel MUSS liefern, was die Caption verspricht. Kein "Du glaubst nie…"-Clickbait, keine falschen Versprechen, keine reisserischen Auslassungen bei ernsten Themen (Entlassungen etc.). Verboten bleiben: "markiere 3 Freunde", Follow-Aufrufe, Emoji-Spam (max. 2 Emojis gesamt).

Regeln für "hashtags": EXAKT 5, CamelCase, ohne #-Zeichen im JSON, nach diesem Mix (Reichweite × Auffindbarkeit):
- 1× gross/generisch: Gaming oder GamingNews
- 1× deutschsprachige Community: GamingDeutschland, Zocken oder GamerDeutschland
- 2× themenspezifisch aus den Tags (Spielname zuerst, z. B. GTA6, PS5, NintendoSwitch2)
- 1× RepublicOfPixels (Marke, immer)

Antworte NUR mit JSON, erstes Zeichen "{":
{"picks":[{"index":0,"headlineLines":[[{"text":"...","cyan":false}]],"caption":"...","hashtags":["..."]}]}
Wenn nichts stark genug ist: {"picks":[]}`;

  const raw = await askClaude({ system: IG_SYSTEM, prompt, maxTokens: 2500 });
  const picks = parseJsonResponse(raw).picks ?? [];
  return picks.filter(
    (p) =>
      candidates[p.index] &&
      Array.isArray(p.headlineLines) &&
      p.headlineLines.length >= 1 &&
      typeof p.caption === "string"
  );
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
    (iso) => zurich(new Date(iso)).day === day
  ).length;

  const cutoff = Date.now() - CANDIDATE_WINDOW_H * 3600000;
  // Qualitäts-Wächter (Tim, 08.08.2026): Nur Artikel posten, deren
  // Original-Bild mindestens ~Full-HD-Höhe hat — schwächere Quellen würden
  // beim 4:5-Zuschnitt sichtbar matschig. Ältere Artikel ohne gespeicherte
  // Auflösung sind übergangsweise zugelassen (Feld existiert erst seit heute).
  const MIN_QUELLHOEHE = 900;
  const fresh = loadArticles().filter(
    (a) =>
      new Date(a.publishedAt).getTime() > cutoff &&
      !state.instagram.posted[a.slug] &&
      a.image?.src &&
      (a.image.sourceHeight == null || a.image.sourceHeight >= MIN_QUELLHOEHE)
  );

  const breaking = fresh.filter((a) => a.category === "breaking");
  const regular = fresh.filter((a) => a.category !== "breaking");

  const slots = [];
  // Breaking geht immer, bis zum Tagesdeckel.
  slots.push(...breaking.slice(0, Math.max(0, CAP_PER_DAY - postedToday)));
  // Nicht-Breaking: nur im Zeitfenster, nur bis zum Grundkontingent,
  // maximal 1 pro Lauf (verteilt die Posts über den Tag).
  const inWindow = hour >= QUIET_BEFORE && hour < QUIET_AFTER;
  const nonBreakingBudget = Math.max(0, BASE_PER_DAY - postedToday - slots.length);
  const maxRegular = inWindow && nonBreakingBudget > 0 ? 1 : 0;

  const candidates = [...slots, ...regular];
  const maxPicks = slots.length + maxRegular;
  if (candidates.length === 0 || maxPicks === 0) {
    console.log(
      `Instagram: keine Posts geplant (heute ${postedToday} gepostet, ${fresh.length} frische Artikel, Fenster ${inWindow ? "offen" : "zu"}).`
    );
    writeFileSync(QUEUE_FILE, JSON.stringify({ token: null, posts: [] }) + "\n");
    return;
  }

  console.log(`Instagram: bis zu ${maxPicks} Post(s) aus ${candidates.length} Kandidaten …`);
  const picks = await pickAndWriteCopy(candidates, maxPicks);

  // Beim Kürzen aufs Kontingent haben Breaking-Picks immer Vorrang.
  picks.sort((a, b) => {
    const ab = candidates[a.index]?.category === "breaking" ? 0 : 1;
    const bb = candidates[b.index]?.category === "breaking" ? 0 : 1;
    return ab - bb;
  });

  const { chromium } = await import("playwright");
  const queue = [];
  for (const pick of picks.slice(0, maxPicks)) {
    const article = candidates[pick.index];
    const imagePath = portraitPathFor(article);
    if (!imagePath) {
      console.log(`  ${article.slug}: kein Bild — übersprungen`);
      continue;
    }
    const badge =
      article.category === "breaking" ? "BREAKING" : article.category === "reviews" ? "REVIEW" : null;

    // Format-Regeln (Tim, 08.08.2026):
    // - BREAKING wird IMMER als Reel gepostet und zählt nicht für den
    //   Wechsel (beeinflusst die Reihenfolge der normalen Posts nicht).
    // - Normale Posts wechseln strikt 50/50: Reel, Bild, Reel … (saubere
    //   A/B-Datenpunkte; Tageszähler im State).
    // Schlägt das Reel-Rendering fehl, greift lautlos das Bild — ein Post
    // geht nie verloren.
    const istBreaking = article.category === "breaking";
    let alsReel;
    if (istBreaking) {
      alsReel = true;
    } else {
      alsReel = state.instagram.wechsel.nichtBreaking % 2 === 0;
      state.instagram.wechsel.nichtBreaking++;
    }
    let cardRel = null;
    if (alsReel) {
      const reelRel = `/social/ig-${article.slug}.mp4`;
      try {
        await renderInstagramReel({
          headlineLines: pick.headlineLines,
          badge,
          imagePath,
          credit: article.image?.credit ?? null,
          outPath: join(ROOT, "public", reelRel),
          chromium,
        });
        cardRel = reelRel;
      } catch (err) {
        console.log(`  ${article.slug}: Reel fehlgeschlagen (${err.message}) — Bild-Fallback`);
      }
    }
    if (!cardRel) {
      cardRel = `/social/ig-${article.slug}.jpg`;
      try {
        await renderInstagramCard({
          headlineLines: pick.headlineLines,
          badge,
          imagePath,
          credit: article.image?.credit ?? null,
          outPath: join(ROOT, "public", cardRel),
          chromium,
        });
      } catch (err) {
        console.log(`  ${article.slug}: Grafik fehlgeschlagen (${err.message}) — übersprungen`);
        continue;
      }
    }

    const hashtags = (pick.hashtags ?? [])
      .slice(0, 5)
      .map((h) => `#${String(h).replace(/[^\p{L}\p{N}]/gu, "")}`)
      .join(" ");
    const caption = `${pick.caption}\n${hashtags}`.replaceAll("ß", "ss");

    queue.push({ slug: article.slug, cardRel, caption });
    // Optimistisch als gepostet markieren: verhindert Doppel-Posts selbst
    // dann, wenn die Publish-Phase später fehlschlägt (bewusster Trade-off:
    // lieber ein verlorener Post als ein doppelter).
    state.instagram.posted[article.slug] = new Date().toISOString();
    state.instagram.cards[cardRel] = new Date().toISOString();
    console.log(`  ✓ Grafik gerendert: ${cardRel}${badge ? ` [${badge}]` : ""}`);
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
    if (new Date(iso).getTime() < forgetAfter) delete state.instagram.posted[slug];
  }

  // Token-Pflege: Langlebige Instagram-Tokens gelten 60 Tage und werden
  // wöchentlich verlängert. Gibt Instagram dabei einen NEUEN Token-String
  // zurück, wird er im State (privates Repo) fortgeschrieben — das GitHub-
  // Secret dient dann nur noch als Bootstrap. Publish nutzt den State-Token,
  // falls vorhanden (via Queue-Datei, damit die Phase ohne State-Commit
  // auskommt).
  const effectiveToken = state.instagram.token?.value ?? process.env.IG_ACCESS_TOKEN;
  const lastCheck = state.instagram.tokenCheckedAt
    ? new Date(state.instagram.tokenCheckedAt).getTime()
    : 0;
  if (effectiveToken && Date.now() - lastCheck > 7 * 86400000) {
    try {
      const res = await fetch(
        `${IG_API.replace("/v23.0", "")}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(effectiveToken)}`
      );
      const data = await res.json();
      if (res.ok && data.access_token) {
        state.instagram.tokenCheckedAt = new Date().toISOString();
        if (data.access_token !== process.env.IG_ACCESS_TOKEN) {
          state.instagram.token = {
            value: data.access_token,
            expiresAt: new Date(Date.now() + (data.expires_in ?? 0) * 1000).toISOString(),
          };
        }
        console.log("Instagram: Token verlängert (gültig bis " +
          new Date(Date.now() + (data.expires_in ?? 0) * 1000).toISOString().slice(0, 10) + ").");
      } else {
        console.log(`Instagram: Token-Verlängerung fehlgeschlagen (${data.error?.message ?? res.status}).`);
      }
    } catch (err) {
      console.log(`Instagram: Token-Verlängerung fehlgeschlagen (${err.message}).`);
    }
  }

  writeFileSync(STATE_FILE, JSON.stringify(loadStateMerge(state), null, 2) + "\n");
  writeFileSync(
    QUEUE_FILE,
    JSON.stringify({ token: state.instagram.token?.value ?? null, posts: queue }, null, 2) + "\n"
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

  for (const item of queueData.posts) {
    const imageUrl = `${SITE}${item.cardRel}`;
    console.log(`Instagram: warte auf ${imageUrl} …`);
    if (!(await waitForUrl(imageUrl))) {
      console.log(`  Grafik nicht erreichbar (Deploy zu langsam?) — Post entfällt: ${item.slug}`);
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
          : { image_url: imageUrl, caption: item.caption, access_token: token }
      );
      // Container-Verarbeitung abwarten — Videos brauchen deutlich länger
      // als Bilder (Transkodierung durch Instagram, bis zu ~3 Minuten).
      const versuche = istReel ? 36 : 12;
      for (let i = 0; i < versuche; i++) {
        const st = await fetch(
          `${IG_API}/${container.id}?fields=status_code&access_token=${encodeURIComponent(token)}`
        ).then((r) => r.json());
        if (st.status_code === "FINISHED") break;
        if (st.status_code === "ERROR") throw new Error("Container-Verarbeitung fehlgeschlagen");
        await new Promise((r) => setTimeout(r, 5000));
      }
      const published = await igPost("/me/media_publish", {
        creation_id: container.id,
        access_token: token,
      });
      console.log(`  ✓ Gepostet (${istReel ? "Reel" : "Bild"}): ${item.slug} (Media-ID ${published.id})`);
    } catch (err) {
      console.log(`  ✗ Post fehlgeschlagen für ${item.slug}: ${err.message}`);
    }
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
