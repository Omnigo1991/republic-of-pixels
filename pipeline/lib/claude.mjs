// Minimale Claude-API-Anbindung ohne SDK-Abhängigkeit.
// Benötigt ANTHROPIC_API_KEY in der Umgebung (GitHub-Actions-Secret).
const API_URL = "https://api.anthropic.com/v1/messages";
export const MODEL = "claude-sonnet-5";

export async function askClaude({ system, prompt, maxTokens = 8000, retries = 2 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY fehlt in der Umgebung");

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(180000),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Claude API HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 15000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Claude API HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      return data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (err) {
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
