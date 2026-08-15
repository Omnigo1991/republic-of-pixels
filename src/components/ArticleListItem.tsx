import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { CATEGORY_LABELS } from "@/lib/types";
import { relativeZeit } from "./StartseiteNeu";

// Chronologische Newsliste, an die "Neueste"-Spalte angelehnt (Tim,
// 15.08.2026): gleiche Anatomie — Cyan-Zeitzeile, fetter Titel, Bild
// rechts — plus Teaser, den die grosse Liste verträgt. EINE Zeilensprache
// für alles, was chronologisch erzählt.
export function ArticleListItem({ article }: { article: Article }) {
  const istNews = article.category === "news";
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="group grid grid-cols-[112px_1fr] items-start gap-4 border-b border-border-subtle py-5 first:pt-0 sm:grid-cols-[192px_1fr] sm:gap-6"
    >
      <div className="relative aspect-[4/3] w-28 self-center overflow-hidden rounded-md sm:aspect-[16/10] sm:w-48">
        <ArticleMedia article={article} sizes="(max-width: 640px) 112px, 192px" className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="min-w-0">
        <p className="mb-1.5 text-[12.5px] font-extrabold tracking-[0.06em] text-accent">
          {relativeZeit(article.publishedAt)}
          {!istNews && (
            <span className="text-text-tertiary"> · {CATEGORY_LABELS[article.category].toUpperCase()}</span>
          )}
        </p>
        <h3 className="text-[17px] font-extrabold leading-[1.32] text-text-primary group-hover:text-accent transition-colors line-clamp-2 sm:text-[18px]">
          {article.title}
        </h3>
        <p className="mt-1.5 hidden text-sm leading-relaxed text-text-secondary line-clamp-2 sm:block">
          {article.excerpt}
        </p>
        <p className="mt-2 text-[12.5px] text-text-secondary">
          Von <b className="font-semibold text-text-primary/80">Republic of Pixels</b> · {article.readingTimeMinutes} Min.
        </p>
      </div>
    </Link>
  );
}
