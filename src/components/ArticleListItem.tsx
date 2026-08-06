import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { CategoryPill } from "./Badges";
import { formatDateTime, splitTitle } from "@/lib/format";

// Chronologische Newsliste — strukturell an play3.de angelehnt (Bild + Text nebeneinander),
// aber mit mehr Weissraum, ruhigerer Typo und klarer Artikeltrennung statt Card-Flut.
export function ArticleListItem({ article }: { article: Article }) {
  const { kicker, headline } = splitTitle(article.title, article.tags);
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="group flex items-center gap-4 sm:gap-6 border-b border-border-subtle py-6 first:pt-0"
    >
      <div className="relative w-28 sm:w-48 shrink-0 self-center overflow-hidden rounded-xl border border-border-subtle aspect-[4/3] sm:aspect-[16/10]">
        <ArticleMedia article={article} sizes="(max-width: 640px) 112px, 192px" className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <CategoryPill category={article.category} />
          <span className="text-xs text-text-tertiary hidden sm:inline">{formatDateTime(article.publishedAt)}</span>
          <span className="text-xs text-text-tertiary">· {article.readingTimeMinutes} Min.</span>
        </div>
        {kicker && (
          <p className="mb-0.5 text-[12px] font-bold uppercase tracking-wider text-accent line-clamp-1">
            {kicker}
          </p>
        )}
        <h3 className="text-base sm:text-lg font-semibold leading-snug text-text-primary group-hover:text-accent transition-colors line-clamp-2">
          {headline}
        </h3>
        <p className="mt-1.5 hidden sm:block text-sm text-text-secondary line-clamp-2">
          {article.excerpt}
        </p>
      </div>
    </Link>
  );
}
