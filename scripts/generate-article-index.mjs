// Generiert src/lib/articles.generated.ts aus allen JSON-Dateien in
// src/content/articles/. Läuft automatisch vor jedem `npm run dev` und
// `npm run build` (siehe package.json pre-Scripts). Die News-Pipeline muss
// dadurch nur eine JSON-Datei ablegen - kein Code-Eingriff nötig.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = join(root, "src", "content", "articles");
const outFile = join(root, "src", "lib", "articles.generated.ts");

const files = readdirSync(articlesDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

const seenSlugs = new Set();
for (const file of files) {
  const data = JSON.parse(readFileSync(join(articlesDir, file), "utf8"));
  for (const field of ["slug", "title", "publishedAt", "category", "body"]) {
    if (data[field] === undefined) {
      throw new Error(`${file}: Pflichtfeld "${field}" fehlt`);
    }
  }
  if (seenSlugs.has(data.slug)) {
    throw new Error(`${file}: Slug "${data.slug}" existiert doppelt`);
  }
  seenSlugs.add(data.slug);
}

const imports = files
  .map((f, i) => `import a${i} from "@/content/articles/${f}";`)
  .join("\n");
const list = files.map((_, i) => `a${i}`).join(", ");

writeFileSync(
  outFile,
  `// AUTOMATISCH GENERIERT von scripts/generate-article-index.mjs - nicht von Hand bearbeiten.
import type { Article } from "./types";

${imports}

export const ALL_ARTICLES = [${list}] as unknown as Article[];
`
);

console.log(`articles.generated.ts: ${files.length} Artikel indexiert`);
