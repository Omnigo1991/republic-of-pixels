import type { Article } from "@/lib/types";
import { InlineArticleCard } from "./InlineArticleCard";

// Lese-Anschluss direkt nach den Quellen, noch vor dem Kommentarbereich -
// erreicht auch Leser:innen, die nicht bis zum Seitenende ("Ähnliche
// Artikel") scrollen. Gleiche Kartenoptik wie die eingebettete
// Artikelempfehlung im Fliesstext und wie die Startseiten-Newsliste.
export function WeiterlesenBox({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <div className="my-8">
      <p className="mb-3 text-[13px] font-semibold tracking-wide text-accent">WEITERLESEN</p>
      <div className="flex flex-col gap-4">
        {articles.slice(0, 2).map((a) => (
          <InlineArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </div>
  );
}
