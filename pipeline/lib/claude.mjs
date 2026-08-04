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
  if (start === -1) throw new Error("Keine JSON-Struktur in der Antwort gefunden");
  return JSON.parse(candidate.slice(start).trim());
}
