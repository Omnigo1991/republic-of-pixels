import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { splitTitle } from "@/lib/format";

// Kompakter Lese-Anschluss direkt nach den Quellen, noch vor dem
// Kommentarbereich — erreicht auch Leser:innen, die nicht bis zum
// Seitenende (Kommentare + "Ähnliche Artikel") scrollen.
export function WeiterlesenBox({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <div className="my-8 rounded-2xl border border-border-default bg-surface-card p-6">
      <p className="mb-4 text-[13px] font-semibold tracking-wide text-accent">WEITERLESEN</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {articles.slice(0, 2).map((a) => {
          const { headline } = splitTitle(a.title, a.tags);
          return (
            <Link
              key={a.slug}
              href={`/artikel/${a.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-border-subtle p-2.5 transition-colors hover:bg-surface-hover"
            >
              <div className="relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-lg border border-border-subtle">
                <ArticleMedia article={a} sizes="64px" className="h-full w-full" />
              </div>
              <p className="text-sm font-medium leading-snug text-text-primary line-clamp-2 group-hover:text-accent transition-colors">
                {headline}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
