import Link from "next/link";
import { KommentarZahl } from "./KommentarZahl";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { CATEGORY_LABELS } from "@/lib/types";
import { relativeZeit } from "./StartseiteNeu";

// Chronologische Newsliste, an die "Neueste"-Spalte angelehnt (Tim,
// 15.08.2026): gleiche Anatomie - Cyan-Zeitzeile, fetter Titel, Bild
// rechts - plus Teaser, den die grosse Liste verträgt. EINE Zeilensprache
// für alles, was chronologisch erzählt.
export function ArticleListItem({ article }: { article: Article }) {
  const istNews = article.category === "news";
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="group grid grid-cols-[112px_1fr] items-center gap-4 border-b border-border-subtle py-6 first:pt-0 sm:grid-cols-[256px_1fr] sm:gap-7"
    >
      <div className="relative aspect-[4/3] w-28 self-center overflow-hidden rounded-lg sm:aspect-[16/10] sm:w-64">
        <ArticleMedia article={article} sizes="(max-width: 640px) 112px, 256px" className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="min-w-0">
        <p className="mb-2 text-[13px] font-extrabold tracking-[0.06em] text-accent">
          {relativeZeit(article.publishedAt)}
          {!istNews && (
            <span className="text-text-tertiary"> · {CATEGORY_LABELS[article.category].toUpperCase()}</span>
          )}
          <span className="whitespace-nowrap text-text-tertiary"> · {article.readingTimeMinutes} MIN.</span>
          <KommentarZahl slug={article.slug} />
        </p>
        <h3 className="text-[17px] font-extrabold leading-[1.32] text-text-primary group-hover:text-accent transition-colors line-clamp-4 sm:line-clamp-3 sm:text-[20px]">
          {article.title}
        </h3>
        <p className="mt-2 hidden text-[15.5px] leading-relaxed text-text-secondary sm:line-clamp-2">
          {article.excerpt}
        </p>
      </div>
    </Link>
  );
}
