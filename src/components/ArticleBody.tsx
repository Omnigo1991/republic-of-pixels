import { Fragment, type ReactNode } from "react";
import type { Article, BodyBlock } from "@/lib/types";
import { ExternalEmbed } from "./ExternalEmbed";
import { InlineArticleCard } from "./InlineArticleCard";

// Bestimmt, wo die eingebettete Artikelempfehlung sitzt: direkt vor der
// zweiten Zwischenüberschrift (wie bei play3.de zwischen zwei Abschnitten),
// bei kürzeren Artikeln mit nur einer Überschrift ersatzweise auf halber
// Strecke — nie mitten in einem Absatz, einer Liste oder einem Zitat.
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
                “{block.text}”
                {block.attribution && (
                  <footer className="mt-2 text-sm not-italic text-text-tertiary">
                    — {block.attribution}
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
          case "stats":
            // Zahlen-Kacheln (Artikel-Bauplan 08.08.2026): die stärksten
            // Zahlen der Story als visuelle Unterbrechung der Textstrecke.
            rendered = (
              <div
                key={i}
                className={`not-prose my-8 grid gap-3 ${block.items.length === 1 ? "grid-cols-1" : block.items.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}
              >
                {block.items.map((s, j) => (
                  // Navy-Kacheln mit Cyan-Zahl und Rauten-Ecke (Hell-Entwurf):
                  // auf der hellen Seite sind die dunklen Kacheln der Blickfang.
                  <div
                    key={j}
                    className="relative overflow-hidden rounded-xl bg-navy px-5 py-6 text-left"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-6 -top-6 h-[70px] w-[70px] rotate-45 border-[6px] border-accent/30"
                    />
                    <p className="[hyphens:auto] break-words text-[clamp(22px,2.1vw,32px)] font-black leading-[1.1] tracking-tight text-accent" lang="de">
                      {s.value}
                    </p>
                    <p className="mt-2 break-words text-[13px] leading-snug text-[#A9ADC0]">{s.label}</p>
                  </div>
                ))}
              </div>
            );
            break;
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
