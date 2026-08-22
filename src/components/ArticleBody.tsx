import { Fragment, type ReactNode } from "react";
import type { Article, BodyBlock } from "@/lib/types";
import { ExternalEmbed } from "./ExternalEmbed";
import { InlineArticleCard } from "./InlineArticleCard";

// Bestimmt, wo die eingebettete Artikelempfehlung sitzt: direkt vor der
// zweiten Zwischenüberschrift (wie bei play3.de zwischen zwei Abschnitten),
// bei kürzeren Artikeln mit nur einer Überschrift ersatzweise auf halber
// Strecke - nie mitten in einem Absatz, einer Liste oder einem Zitat.
function findInsertIndex(blocks: BodyBlock[]): number {
  const headingIndices = blocks
    .map((b, i) => (b.type === "heading" ? i : -1))
    .filter((i) => i >= 0);
  if (headingIndices.length >= 2) return headingIndices[1];
  return Math.floor(blocks.length / 2);
}

export function ArticleBody({
  blocks,
  inlineRelated,
}: {
  blocks: BodyBlock[];
  inlineRelated?: Article;
}) {
  const insertIndex = inlineRelated ? findInsertIndex(blocks) : -1;
  return (
    <div className="prose-rop max-w-none">
      {blocks.map((block, i) => {
        const card =
          i === insertIndex && inlineRelated ? (
            <div key="inline-related" className="my-8">
              <InlineArticleCard article={inlineRelated} />
            </div>
          ) : null;

        let rendered: ReactNode;
        switch (block.type) {
          case "paragraph":
            rendered = <p key={i}>{block.text}</p>;
            break;
          case "heading":
            rendered = (
              <h2 key={i} id={slugify(block.text)}>
                {block.text}
              </h2>
            );
            break;
          case "quote":
            rendered = (
              <blockquote key={i}>
                {/* Ohne Anfuehrungszeichen im Text: Das riesige „ links
                    (globals.css ::before) uebernimmt die Kennzeichnung -
                    doppelte Zeichen saehen gestottert aus. */}
                {block.text}
                {block.attribution && (
                  <footer className="mt-4 flex items-center gap-2.5 border-0 not-italic">
                    <span className="text-[13.5px] font-bold text-[#8F95A9]">
                      {block.attribution}
                    </span>
                  </footer>
                )}
              </blockquote>
            );
            break;
          case "list":
            rendered = (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
            break;
          case "embed":
            rendered = <ExternalEmbed key={i} platform={block.platform} url={block.url} />;
            break;
          case "stats": {
            // Zahlen-Kacheln (Artikel-Bauplan 08.08.2026): die stärksten
            // Zahlen der Story als visuelle Unterbrechung der Textstrecke.
            //
            // EINE Schriftgrösse für ALLE Kacheln einer Gruppe (Tim,
            // 16.08.2026): Sie richtet sich nach dem LÄNGSTEN Wert, damit
            // keine Kachel anders gestaltet ist als ihre Nachbarn - und
            // nichts über den Rand läuft.
            const laengster = Math.max(...block.items.map((s) => s.value.length));
            const wertGroesse =
              laengster <= 8
                ? "text-[30px] sm:text-[34px]"
                : laengster <= 13
                  ? "text-[22px] sm:text-[25px]"
                  : "text-[18px] sm:text-[20px]";
            rendered = (
              <div
                key={i}
                className={`not-prose my-8 grid gap-3 ${block.items.length === 1 ? "grid-cols-1" : block.items.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}
              >
                {block.items.map((s, j) => (
                  // Verlauf wie die Personen-Kacheln auf "Ueber uns"
                  // (Tim, 19.08.2026): Die Zahlen sollen die Textstrecke
                  // unterbrechen, nicht sich einfuegen. Schrift darin
                  // dunkel - Cyan auf Magenta waere nicht lesbar.
                  <div
                    key={j}
                    className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(120deg,rgba(2,240,209,0.92)_0%,rgba(2,240,209,0.84)_46%,rgba(255,46,151,0.84)_100%)] px-5 py-5 text-left"
                  >
                    {/* Standard-Verlauf wie die Newsletter-Kachel (Tim,
                        22.08.2026), Zahl und Text in Navy. */}
                    <p className={`font-extrabold leading-[1.15] tracking-tight text-[#0C0B1A] ${wertGroesse}`}>
                      {s.value}
                    </p>
                    <p className="mt-1.5 break-words text-[12.5px] font-medium leading-snug text-[#0C0B1A]">{s.label}</p>
                  </div>
                ))}
              </div>
            );
            break;
          }
          default:
            rendered = null;
        }

        return (
          <Fragment key={i}>
            {card}
            {rendered}
          </Fragment>
        );
      })}
    </div>
  );
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüss\s-]/g, "")
    .replace(/\s+/g, "-");
}
