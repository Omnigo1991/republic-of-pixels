import type { BodyBlock } from "@/lib/types";
import { ExternalEmbed } from "./ExternalEmbed";

export function ArticleBody({ blocks }: { blocks: BodyBlock[] }) {
  return (
    <div className="prose-rop max-w-none">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return <p key={i}>{block.text}</p>;
          case "heading":
            return (
              <h2 key={i} id={slugify(block.text)}>
                {block.text}
              </h2>
            );
          case "quote":
            return (
              <blockquote key={i}>
                “{block.text}”
                {block.attribution && (
                  <footer className="mt-2 text-sm not-italic text-text-tertiary">
                    — {block.attribution}
                  </footer>
                )}
              </blockquote>
            );
          case "list":
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "embed":
            return <ExternalEmbed key={i} platform={block.platform} url={block.url} />;
          default:
            return null;
        }
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
