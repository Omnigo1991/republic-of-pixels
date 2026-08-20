// Einmal-Migration (08.08.2026, Tim-Vorgabe): Fremdsprachige wörtliche
// Zitate in Bestandsartikeln ins Deutsche übersetzen. Neue Artikel liefern
// deutsche Zitate direkt aus der Pipeline (run.mjs-Prompt); dieses Skript
// zieht die 64 Bestandsartikel nach. Start: GitHub → Actions →
// "Zitate übersetzen" → Run workflow. Danach kann der Workflow bleiben
// (er ist idempotent - deutsche Zitate bleiben unangetastet).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { askClaude, parseJsonResponse, MODELL_HANDWERK } from "./lib/claude.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTICLES_DIR = join(ROOT, "src", "content", "articles");

const SYSTEM = `Du bist Übersetzungsredaktion eines deutschsprachigen Gaming-Magazins (SCHWEIZER Rechtschreibung: NIEMALS "ß", immer "ss"). Du übersetzt wörtliche Zitate präzise und neutral ins Deutsche - nichts zuspitzen, nichts weglassen, Fachbegriffe der Gaming-Branche natürlich übertragen.`;

async function uebersetze(batch) {
  const liste = batch.map((z, i) => `${i} | ${z.text}`).join("\n");
  const prompt = `Hier sind wörtliche Zitate aus Artikeln (Format: Index | Zitat). Übersetze JEDES nicht-deutsche Zitat ins Deutsche. Bereits deutsche Zitate lässt du aus.

${liste}

Antworte NUR mit JSON, erstes Zeichen "{": {"uebersetzungen":[{"index":0,"deutsch":"..."}]}
Wenn alle bereits deutsch sind: {"uebersetzungen":[]}`;
  // Übersetzen ist Handwerk, kein Urteil - das kleinere Modell reicht.
  // Bewusst MODELL_HANDWERK statt MODELL_TEXT: Seit dem 14.08.2026 laeuft
  // der Artikeltext auf Opus, das Uebersetzen soll dort NICHT mitwandern.
  // Budget 9000, weil sich das Nachdenken das Budget mit der Antwort teilt.
  const raw = await askClaude({
    system: SYSTEM,
    prompt,
    maxTokens: 9000,
    model: MODELL_HANDWERK,
  });
  return parseJsonResponse(raw).uebersetzungen ?? [];
}

async function main() {
  // Alle Zitate einsammeln (Referenz auf Datei + Block-Index).
  const zitate = [];
  for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"))) {
    const artikel = JSON.parse(readFileSync(join(ARTICLES_DIR, f), "utf8"));
    (artikel.body ?? []).forEach((b, i) => {
      if (b.type === "quote" && typeof b.text === "string") {
        zitate.push({ file: f, blockIndex: i, text: b.text });
      }
    });
  }
  console.log(`${zitate.length} Zitate gefunden.`);
  if (zitate.length === 0) return;

  // In 20er-Paketen übersetzen (eine grosse Anfrage wäre fehleranfällig).
  let geaendert = 0;
  for (let start = 0; start < zitate.length; start += 20) {
    const batch = zitate.slice(start, start + 20);
    const fixes = await uebersetze(batch);
    for (const fix of fixes) {
      const ziel = batch[fix.index];
      if (!ziel || typeof fix.deutsch !== "string" || fix.deutsch.length < 5) continue;
      const pfad = join(ARTICLES_DIR, ziel.file);
      const artikel = JSON.parse(readFileSync(pfad, "utf8"));
      const block = artikel.body?.[ziel.blockIndex];
      // Nur ersetzen, wenn der Block noch exakt das erwartete Zitat trägt.
      if (block?.type !== "quote" || block.text !== ziel.text) continue;
      block.text = fix.deutsch.replaceAll("ß", "ss");
      writeFileSync(pfad, JSON.stringify(artikel, null, 2) + "\n");
      geaendert++;
      console.log(`  ✓ ${ziel.file} [Block ${ziel.blockIndex}]`);
    }
  }
  console.log(`Fertig: ${geaendert} Zitat(e) übersetzt.`);
}

main().catch((err) => {
  console.error("Migration fehlgeschlagen:", err);
  process.exit(1);
});
