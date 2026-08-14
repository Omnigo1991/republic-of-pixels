// Minimale Claude-API-Anbindung ohne SDK-Abhängigkeit.
// Benötigt ANTHROPIC_API_KEY in der Umgebung (GitHub-Actions-Secret).
const API_URL = "https://api.anthropic.com/v1/messages";

// EIN MODELL PRO AUFGABE (Tim, 14.08.2026).
//
// Bis heute ging jeder Aufruf an dasselbe Modell — Themenauswahl,
// Artikeltext, Korrekturlesen und Instagram-Texte. Das war nie entschieden:
// Die Zeile stand seit dem ersten Commit da und wurde nie hinterfragt.
//
// Jetzt entscheidet die AUFGABE. Die Namen sagen, warum:
//
//   URTEIL    — Aufgaben, bei denen etwas beurteilt wird: Welche Meldung ist
//               es wert? Welcher Ton trifft? Welcher Bildausschnitt wirkt?
//               Wenige Aufrufe pro Tag, hoher Hebel.
//   TEXT      — Artikel schreiben und übersetzen. Der Grossteil des
//               Verbrauchs. Bleibt vorerst auf Sonnet, bis Tim einen direkten
//               Vergleich beider Modelle an denselben Quellen beurteilt hat.
//   HANDWERK  — Korrekturlesen. BEWUSST das kleinere Modell, nicht aus
//               Sparsamkeit: Opus 5 neigt dazu, einen Auftrag auszuweiten und
//               Dinge zu verbessern, nach denen niemand gefragt hat. Bei
//               einem Schritt, der ausschliesslich Tippfehler finden und
//               sonst nichts anfassen darf, ist das ein Risiko.
export const MODELL_URTEIL = "claude-opus-5";
export const MODELL_TEXT = "claude-sonnet-5";
export const MODELL_HANDWERK = "claude-sonnet-5";

// Rückwärtskompatibler Vorgabewert für Aufrufe ohne eigene Modellangabe.
export const MODEL = MODELL_TEXT;

// Server-seitiger Rückfall bei Ablehnung (siehe ClaudeAblehnung unten).
// Nur für Modelle, die ihn unterstützen — bei den übrigen würde der
// Parameter die Anfrage ungültig machen.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const MIT_FALLBACK = new Set(["claude-opus-5", "claude-fable-5"]);

// ZEITGRENZE (heraufgesetzt 14.08.2026): 180 Sekunden waren auf Sonnet
// zugeschnitten. Opus denkt vor der Antwort länger nach; bei langen Artikeln
// kam das der alten Grenze gefährlich nahe. Sieben Minuten sind grosszügig —
// ein Abbruch kostet einen ganzen Lauf, ein paar Minuten Wartezeit nicht.
const ZEITGRENZE_MS = 420000;

// Listenpreise je Million Token [Eingang, Ausgang], Stand 14.08.2026.
// Sonnet 5 läuft derzeit auf einem niedrigeren Einführungspreis, der Ende
// August ausläuft — wir rechnen bewusst mit dem regulären Preis. Damit ist
// die ausgewiesene Summe eine Obergrenze und wird nicht plötzlich falsch,
// wenn die Einführungsphase endet.
// claude-opus-4-8 steht mit drin, weil der Rückfall bei einer Ablehnung
// dorthin führen kann — die Antwort trägt dann DIESEN Modellnamen. Ohne den
// Eintrag hätte der Bericht die Kosten still als 0 ausgewiesen (gefunden
// beim Prüflauf 14.08.2026, bevor es echtes Geld betraf).
const PREISE = {
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-fable-5": [10, 50],
  "claude-sonnet-5": [3, 15],
  "claude-haiku-4-5": [1, 5],
};

/**
 * Eine Ablehnung durch die Sicherheitsfilter des Modells.
 *
 * WARUM EIGENE FEHLERART (Tim, 14.08.2026): Opus 5 hat schärfere Filter als
 * Sonnet, unter anderem bei Hacking-Themen. Wir berichten über Leaks,
 * Datendiebstähle und Angriffe auf Studios — das kann sie auslösen.
 *
 * Eine Ablehnung sah für den alten Code aus wie eine leere Antwort. Er hätte
 * dieselbe Anfrage dreimal wiederholt (die zwangsläufig dreimal abgelehnt
 * wird) und danach den GANZEN Lauf beendet. Das hätte nicht einen Artikel
 * gekostet, sondern alle des Laufs.
 *
 * Darum: eigene Fehlerart, KEINE Wiederholung, und die Aufrufstellen können
 * gezielt nur diesen einen Artikel überspringen.
 */
export class ClaudeAblehnung extends Error {
  constructor(kategorie, erklaerung) {
    super(
      `Claude hat die Anfrage abgelehnt (Kategorie: ${kategorie ?? "unbekannt"})` +
        (erklaerung ? `: ${erklaerung}` : ""),
    );
    this.name = "ClaudeAblehnung";
    this.kategorie = kategorie ?? null;
  }
}

// VERBRAUCH MITSCHREIBEN (Tim, 14.08.2026): Bisher haben wir über
// geschätzte Kosten geredet. Die API liefert den echten Verbrauch bei jedem
// Aufruf mit — wir haben ihn nur weggeworfen. Jetzt wird er summiert und am
// Ende des Laufs ausgegeben, damit die nächste Modellentscheidung auf
// gemessenen Zahlen steht statt auf meiner Schätzung.
const verbrauch = new Map();

function verbuche(modell, usage) {
  if (!usage) return;
  const eintrag = verbrauch.get(modell) ?? { aufrufe: 0, ein: 0, aus: 0 };
  eintrag.aufrufe++;
  // Zwischenspeicher-Token zählen zum Eingang; sie sind billiger, aber für
  // eine Obergrenze rechnen wir sie voll.
  eintrag.ein +=
    (usage.input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0);
  eintrag.aus += usage.output_tokens ?? 0;
  verbrauch.set(modell, eintrag);
}

/** Gibt den Verbrauch des laufenden Prozesses aus. Am Lauf-Ende aufrufen. */
export function verbrauchBericht() {
  if (verbrauch.size === 0) return;
  let summe = 0;
  console.log("Claude-Verbrauch (Listenpreis, Obergrenze):");
  let unbekannt = false;
  for (const [modell, e] of verbrauch) {
    const preis = PREISE[modell];
    if (!preis) unbekannt = true;
    const [pEin, pAus] = preis ?? [0, 0];
    const kosten = (e.ein / 1e6) * pEin + (e.aus / 1e6) * pAus;
    summe += kosten;
    console.log(
      `  ${modell}: ${e.aufrufe} Aufrufe, ${e.ein} ein / ${e.aus} aus — ` +
        (preis ? `$${kosten.toFixed(4)}` : "Preis unbekannt, NICHT in der Summe"),
    );
  }
  console.log(`  Summe: $${summe.toFixed(4)}`);
  if (unbekannt) {
    console.log(
      `::warning::Claude-Verbrauch: Für mindestens ein Modell fehlt der Preis — die Summe ist zu niedrig. PREISE in pipeline/lib/claude.mjs ergänzen.`,
    );
  }
}

/**
 * @param {object}  o
 * @param {string}  o.system      Systemvorgabe
 * @param {string} [o.prompt]     Anfrage als reiner Text
 * @param {Array}  [o.content]    Anfrage als Blöcke (Text UND Bilder). Wird
 *                                gesetzt, wenn Claude etwas ANSCHAUEN soll —
 *                                gebraucht vom Bild-Tor. Schliesst prompt aus.
 * @param {number} [o.maxTokens]  Obergrenze für NACHDENKEN UND ANTWORT
 *                                zusammen — siehe Hinweis unten.
 * @param {number} [o.retries]    Wiederholungen bei technischen Fehlern
 * @param {string} [o.model]      Modell (MODELL_URTEIL / _TEXT / _HANDWERK)
 * @param {string} [o.effort]     Denktiefe: low | medium | high | xhigh | max
 * @param {number} [o.timeoutMs]  Zeitgrenze je Versuch
 * @throws {ClaudeAblehnung} bei Ablehnung durch die Sicherheitsfilter
 */
export async function askClaude({
  system,
  prompt,
  content,
  maxTokens = 8000,
  retries = 2,
  model = MODEL,
  effort,
  timeoutMs = ZEITGRENZE_MS,
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY fehlt in der Umgebung");
  if (!prompt && !content) throw new Error("askClaude: weder prompt noch content angegeben");

  // NACHDENKEN TEILT SICH DAS BUDGET MIT DER ANTWORT (Fund 14.08.2026):
  // Wir setzen den Parameter "thinking" nirgends. Bei Sonnet 5 und Opus 5
  // heisst "nicht gesetzt" aber EINGESCHALTET — bei den Vorgängerversionen
  // hiess es ausgeschaltet, und die Umstellung ist still passiert.
  //
  // Folge: maxTokens ist eine gemeinsame Obergrenze für das Nachdenken UND
  // die eigentliche Antwort. Ein knapp bemessenes Budget bricht deshalb
  // mitten in der Antwort ab, ohne dass am Prompt etwas falsch wäre. Genau
  // das hat am 10.08. zwei Posts gekostet. Wer hier ein Budget setzt, muss
  // Platz für beides lassen.
  const koerper = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: content ?? prompt }],
  };
  if (effort) koerper.output_config = { effort };

  const kopf = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  // Merker für das Sicherheitsnetz weiter unten.
  let mitFallback = false;
  if (MIT_FALLBACK.has(model)) {
    // "default" statt eines fest benannten Ersatzmodells: Der Rückfall wird
    // nach Ablehnungsgrund gewählt und bleibt richtig, wenn Anthropic die
    // Modellpalette ändert. Ein fest verdrahteter Name wäre eine Wartungs-
    // schuld, die uns irgendwann still bricht.
    koerper.fallbacks = "default";
    kopf["anthropic-beta"] = FALLBACK_BETA;
    mitFallback = true;
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: kopf,
        body: JSON.stringify(koerper),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Claude API HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 15000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) {
        const rumpf = await res.text();
        // SICHERHEITSNETZ FÜR DEN RÜCKFALL-PARAMETER (14.08.2026).
        //
        // Der Rückfall bei Ablehnung ist eine junge API-Funktion. Ob unser
        // Konto sie akzeptiert, konnte ich beim Bauen nicht prüfen — hier
        // liegt kein Schlüssel. Wird sie abgelehnt, kommt HTTP 400, und
        // JEDER Opus-Aufruf scheitert: Die Themenauswahl stirbt, und mit ihr
        // der ganze Lauf. Ein Tag ohne Artikel wegen eines Parameters, der
        // nur eine Absicherung sein sollte.
        //
        // Darum: Einmal ohne den Parameter wiederholen. Wir verlieren dann
        // den automatischen Rückfall (eine Ablehnung überspringt eben den
        // Beitrag) — aber der Lauf läuft. Die Warnung macht sichtbar, dass
        // nachgebessert werden muss, statt es still zu verschlucken.
        if (res.status === 400 && mitFallback) {
          console.log(
            `::warning::Claude: Rückfall-Parameter abgelehnt (HTTP 400) — Wiederholung ohne ihn. Bitte pipeline/lib/claude.mjs prüfen. Antwort: ${rumpf.slice(0, 200)}`,
          );
          delete koerper.fallbacks;
          delete kopf["anthropic-beta"];
          mitFallback = false;
          // lastError setzen, bevor wir fortfahren: Wäre das der letzte
          // Versuch gewesen, würfe die Schleife sonst "undefined" statt
          // einer Fehlermeldung.
          lastError = new Error(`Claude API HTTP 400 (Rückfall-Parameter): ${rumpf.slice(0, 200)}`);
          // Dieser Versuch zählt nicht — er war ein Konfigurationsfehler auf
          // unserer Seite, kein Ausfall der Gegenstelle.
          if (attempt === retries) retries++;
          continue;
        }
        throw new Error(`Claude API HTTP ${res.status}: ${rumpf}`);
      }
      // ROHTEXT ZUERST (Nachbesserung 10.08.2026): Beim 20:10-Lauf kam die
      // Antwort mit Status 200 und LEEREM RUMPF — res.json() scheiterte
      // selbst ("Unexpected end of JSON input"), also noch bevor die
      // Leer-Prüfung weiter unten greifen konnte. Darum wird der Rumpf jetzt
      // als Text gelesen und erst danach ausgewertet. Beide Fälle (leerer
      // Rumpf, unlesbares JSON) gelten als Fehlversuch und werden wiederholt.
      const roh = await res.text();
      if (!roh.trim()) {
        lastError = new Error(`Claude API lieferte einen leeren Rumpf (HTTP ${res.status})`);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 10000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
      let data;
      try {
        data = JSON.parse(roh);
      } catch {
        lastError = new Error(
          `Claude API lieferte unlesbares JSON (HTTP ${res.status}): ${roh.slice(0, 200)}`,
        );
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 10000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }

      // Verbrauch auch bei abgebrochenen oder abgelehnten Antworten buchen —
      // bezahlt wird trotzdem, und genau die Fälle wollen wir sehen.
      verbuche(data.model ?? model, data.usage);

      // ABLEHNUNG VOR DEM INHALT PRÜFEN (14.08.2026): Bei einer Ablehnung
      // kommt Status 200 mit leerem Inhalt. Ohne diese Prüfung landet der
      // Fall in der Leer-Antwort-Wiederholung weiter unten — dieselbe
      // Anfrage wird dreimal gestellt und dreimal abgelehnt, dann stirbt der
      // Lauf. Eine Ablehnung ist kein Schluckauf, sondern eine Entscheidung:
      // nicht wiederholen, sondern diesen einen Beitrag überspringen.
      if (data.stop_reason === "refusal") {
        throw new ClaudeAblehnung(
          data.stop_details?.category,
          data.stop_details?.explanation,
        );
      }

      const text = (data.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      // LEERE ANTWORT ZÄHLT ALS FEHLVERSUCH (Fund 10.08.2026): Die API kann
      // mit Status 200 und leerem Inhalt antworten. Bisher galt das als
      // Erfolg — die leere Zeichenkette lief weiter bis zum JSON-Parser, der
      // abbrach und den GESAMTEN Lauf beendete. Am 10.08. kostete das den
      // 19:38-Lauf und damit zwei Posts, weil der nächste planmässige Lauf
      // erst nach Fensterschluss kam. Jetzt wird stattdessen wiederholt.
      // ABGESCHNITTENE ANTWORT (Fund 10.08.2026): Reicht das Token-Budget
      // nicht, liefert die API eine gueltige, aber MITTENDRIN abgebrochene
      // Antwort — das JSON ist dann unlesbar ("Unterminated string"). Das
      // kostete am 10.08. zwei Posts und war schwer zu finden, weil der
      // Fehler erst beim Parser auftauchte. stop_reason sagt es direkt.
      if (data.stop_reason === "max_tokens") {
        lastError = new Error(
          `Claude API brach die Antwort ab (Token-Budget ${maxTokens} erschoepft) — Budget erhoehen`,
        );
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        throw lastError;
      }
      if (!text.trim()) {
        lastError = new Error(
          `Claude API lieferte eine leere Antwort (stop_reason: ${data.stop_reason ?? "unbekannt"})`,
        );
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 10000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
      return text;
    } catch (err) {
      // Eine Ablehnung wird NIE wiederholt — siehe ClaudeAblehnung oben.
      if (err instanceof ClaudeAblehnung) throw err;
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 10000));
    }
  }
  throw lastError;
}

// Extrahiert das erste vollständige JSON-Objekt/-Array aus einer Modellantwort
// (tolerant gegenüber ```json-Zäunen und umgebendem Text).
export function parseJsonResponse(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[\[{]/);
  if (start === -1) {
    throw new Error(
      `Keine JSON-Struktur in der Antwort gefunden. Antwortbeginn: "${text.slice(0, 300)}"`
    );
  }
  const slice = candidate.slice(start).trim();
  try {
    return JSON.parse(slice);
  } catch {
    return JSON.parse(repariereJson(slice));
  }
}

// Modelle schreiben gelegentlich ungültiges JSON: rohe Zeilenumbrüche mitten
// in Strings (typisch bei mehrzeiligen Captions) oder Prosa hinter dem
// schliessenden Objekt. Beides kostete am 08.08.2026 vier Instagram-Läufe
// ("Unterminated string in JSON"). Diese Reparatur escapet Steuerzeichen
// innerhalb von String-Literalen und schneidet das erste balancierte
// Objekt/Array aus — sie kann gültiges JSON nie verschlechtern, weil rohe
// Steuerzeichen in JSON-Strings per Spezifikation verboten sind.
function repariereJson(text) {
  let out = "";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      const code = ch.codePointAt(0);
      if (code < 0x20) {
        out += code === 10 ? "\\n" : code === 13 ? "" : code === 9 ? "\\t" : "";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    if (ch === "}" || ch === "]") depth--;
    out += ch;
    if (depth === 0) break;
  }
  return out;
}
