import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { CategoryPill } from "./Badges";
import { formatDateTime } from "@/lib/format";

// Grid-Card für Kategorie- und "Ähnliche Artikel"-Sektionen.
export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card hover:bg-surface-hover transition-colors"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <ArticleMedia article={article} sizes="(max-width: 640px) 100vw, 33vw" className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <CategoryPill category={article.category} />
          <span className="text-xs text-text-tertiary">{formatDateTime(article.publishedAt)}</span>
        </div>
        <h3 className="text-lg font-semibold leading-snug text-text-primary group-hover:text-accent transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-2">{article.excerpt}</p>
        <span className="mt-auto pt-2 text-xs text-text-tertiary">{article.readingTimeMinutes} Min. Lesezeit</span>
      </div>
    </Link>
  );
}
