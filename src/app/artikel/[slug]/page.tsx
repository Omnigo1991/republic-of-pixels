import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllArticles,
  getArticleBySlug,
  getRelated,
} from "@/lib/articles";
import { CATEGORY_LABELS, PLATFORM_LABELS } from "@/lib/types";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { CategoryPill, LeakBanner, Tag } from "@/components/Badges";
import { ArticleBody } from "@/components/ArticleBody";
import { TldrBox, WhyItMattersBox, ReviewBox, SourcesBox } from "@/components/ArticleBoxes";
import { ReactionBar } from "@/components/ReactionBar";
import { ShareButtons } from "@/components/ShareButtons";
import { ReadingProgress } from "@/components/ReadingProgress";
import { CommentSection } from "@/components/CommentSection";
import { ArticleCard } from "@/components/ArticleCard";
import { formatDateTime } from "@/lib/format";

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getArticleBySlug(params.slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      authors: [article.author],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
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
    description: article.excerpt,
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
            <Tag key={p}>{PLATFORM_LABELS[p]}</Tag>
          ))}
        </div>

        <h1 className="text-3xl sm:text-[2.5rem] font-semibold leading-[1.15] tracking-tight text-text-primary">
          {article.title}
        </h1>
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

        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-border-subtle">
          <PlaceholderArt variant={article.heroVariant} className="h-full w-full" />
        </div>

        <TldrBox items={article.tldr} />

        <ArticleBody blocks={article.body} />

        <WhyItMattersBox text={article.whyItMatters} />

        {article.review && <ReviewBox review={article.review} />}

        <SourcesBox sources={article.sources} />

        <div className="my-8 flex flex-wrap items-center justify-between gap-4 border-y border-border-subtle py-6">
          <ReactionBar />
          <ShareButtons title={article.title} />
        </div>

        <CommentSection />
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
