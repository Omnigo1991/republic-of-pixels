import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { CategoryPill } from "./Badges";
import { formatDateTime } from "@/lib/format";

export function TopStory({ article }: { article: Article }) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="group grid gap-6 lg:grid-cols-2 lg:gap-10 lg:items-center"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border-subtle shadow-elevated">
        <ArticleMedia article={article} priority sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
      </div>
      <div>
        <div className="mb-4 flex items-center gap-3">
          <CategoryPill category={article.category} />
          <span className="text-xs text-text-tertiary">{formatDateTime(article.publishedAt)}</span>
          <span className="text-xs text-text-tertiary">· {article.readingTimeMinutes} Min. Lesezeit</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-text-primary group-hover:text-accent transition-colors">
          {article.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">{article.subtitle}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
          Zum Artikel
          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
