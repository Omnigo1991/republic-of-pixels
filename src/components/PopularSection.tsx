import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { CategoryPill } from "./Badges";

export function PopularSection({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  const [first, ...rest] = articles;

  return (
    <section aria-labelledby="popular-heading" className="py-4">
      <div className="mb-6 flex items-center justify-between">
        <h2 id="popular-heading" className="text-xl font-semibold tracking-tight text-text-primary">
          Beliebt bei Lesern
        </h2>
        <span className="text-xs text-text-tertiary">Diese Woche</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <PopularCard article={first} rank={1} large />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2 gap-5">
          {rest.slice(0, 4).map((a, i) => (
            <PopularCard key={a.slug} article={a} rank={i + 2} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PopularCard({
  article,
  rank,
  large = false,
}: {
  article: Article;
  rank: number;
  large?: boolean;
}) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card hover:bg-surface-hover transition-colors ${
        large ? "" : ""
      }`}
    >
      <div className={`relative overflow-hidden ${large ? "aspect-[16/10]" : "aspect-[16/9]"}`}>
        <ArticleMedia article={article} sizes="(max-width: 640px) 100vw, 33vw" className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-bg-base/80 text-xs font-bold text-accent backdrop-blur">
          {String(rank).padStart(2, "0")}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Block-Wrapper: verhindert, dass der Flex-Column-Container die Pill
            auf volle Breite streckt — Pill bleibt inhaltsbreit wie in der Newsliste. */}
        <div>
          <CategoryPill category={article.category} />
        </div>
        <h3 className={`font-semibold leading-snug text-text-primary group-hover:text-accent transition-colors ${large ? "text-lg" : "text-[15px]"} line-clamp-2`}>
          {article.title}
        </h3>
        {/* Die grosse Karte spannt zwei Rasterzeilen — der Teaser füllt die Höhe sinnvoll. */}
        {large && (
          <p className="text-sm leading-relaxed text-text-secondary line-clamp-4">{article.excerpt}</p>
        )}
      </div>
    </Link>
  );
}
