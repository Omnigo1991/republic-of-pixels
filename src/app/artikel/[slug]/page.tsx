import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllArticles,
  getArticleBySlug,
  getRelated,
} from "@/lib/articles";
import { CATEGORY_LABELS, PLATFORM_LABELS } from "@/lib/types";
import { ArticleMedia } from "@/components/ArticleMedia";
import { CategoryPill, LeakBanner, Tag } from "@/components/Badges";
import { PlatformIcon } from "@/components/PlatformIcons";
import { ArticleBody } from "@/components/ArticleBody";
import { TldrBox, WhyItMattersBox, ReviewBox, SourcesBox } from "@/components/ArticleBoxes";
import { ShareButtons } from "@/components/ShareButtons";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ArticleCard } from "@/components/ArticleCard";
import { formatDateTime, splitTitle } from "@/lib/format";

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getArticleBySlug(params.slug);
  if (!article) return {};
  const title = article.seoTitle ?? article.title;
  const description = article.metaDescription ?? article.excerpt;
  const images = article.image?.src ? [{ url: article.image.src, alt: article.image.alt }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/artikel/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: article.publishedAt,
      authors: [article.author],
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticleBySlug(params.slug);
  if (!article) notFound();

  const related = getRelated(article, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.metaDescription ?? article.excerpt,
    ...(article.image?.src
      ? { image: [`https://www.republicofpixels.com${article.image.src}`] }
      : {}),
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: [{ "@type": "Organization", name: "Republic of Pixels" }],
    publisher: {
      "@type": "Organization",
      name: "Republic of Pixels",
      logo: { "@type": "ImageObject", url: "https://www.republicofpixels.com/favicon.svg" },
    },
    mainEntityOfPage: `https://www.republicofpixels.com/artikel/${article.slug}`,
  };

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-article px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <CategoryPill category={article.category} />
          {article.platforms.map((p) => (
            <Tag key={p}>
              <PlatformIcon platform={p} className="mr-1.5 h-3.5 w-3.5" />
              {PLATFORM_LABELS[p]}
            </Tag>
          ))}
        </div>

        {(() => {
          const { kicker, headline } = splitTitle(article.title, article.tags);
          return (
            <>
              {kicker && (
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-accent">
                  {kicker}
                </p>
              )}
              <h1 className="text-3xl sm:text-[2.5rem] font-semibold leading-[1.15] tracking-tight text-text-primary">
                {headline}
              </h1>
            </>
          );
        })()}
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">{article.subtitle}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border-subtle py-4 text-sm text-text-tertiary">
          <span className="font-medium text-text-secondary">{article.author}</span>
          <span>{formatDateTime(article.publishedAt)}</span>
          <span>{article.readingTimeMinutes} Min. Lesezeit</span>
        </div>

        {article.isLeakOrRumor && (
          <div className="mt-6">
            <LeakBanner />
          </div>
        )}

        <figure className="mt-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border-subtle">
            <ArticleMedia article={article} priority sizes="(max-width: 768px) 100vw, 680px" className="h-full w-full" />
          </div>
          {article.image?.credit && (
            <figcaption className="mt-2 text-xs text-text-tertiary">{article.image.credit}</figcaption>
          )}
        </figure>

        <TldrBox items={article.tldr} />

        <ArticleBody blocks={article.body} />

        <WhyItMattersBox text={article.whyItMatters} />

        {article.review && <ReviewBox review={article.review} />}

        <SourcesBox sources={article.sources} />

        {/* Reaktionen und Kommentare folgen erst mit echter Datenhaltung
            (docs/vergleich-2026-08.md, Sofortmassnahme 3): keine Attrappen live. */}
        <div className="my-8 flex flex-wrap items-center justify-end gap-4 border-y border-border-subtle py-6">
          <ShareButtons title={article.title} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="mb-6 text-xl font-semibold tracking-tight text-text-primary">
            Ähnliche Artikel
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={`/kategorie/${article.category}`}
              className="inline-flex items-center gap-2 rounded-full border border-border-default px-5 py-2.5 text-sm font-medium text-text-secondary hover:border-accent/50 hover:text-accent transition-colors"
            >
              Weiterlesen in {CATEGORY_LABELS[article.category]}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
