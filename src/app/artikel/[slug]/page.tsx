import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllArticles,
  getArticleBySlug,
  getRelated,
} from "@/lib/articles";
import { CATEGORY_LABELS } from "@/lib/types";
import { ArticleMedia } from "@/components/ArticleMedia";
import { LeakBanner } from "@/components/Badges";
import { PlatformIcon } from "@/components/PlatformIcons";
import { ArticleBody } from "@/components/ArticleBody";
import { TldrBox, WhyItMattersBox, ReviewBox, SourcesBox } from "@/components/ArticleBoxes";
import { WeiterlesenBox } from "@/components/WeiterlesenBox";
import { PollBox } from "@/components/PollBox";
import { ShareButtons } from "@/components/ShareButtons";
import { CommentSection } from "@/components/CommentSection";
import { ArticleReactions } from "@/components/ArticleReactions";
import { NotchKarte } from "@/components/StartseiteNeu";
import { SectionDivider } from "@/components/SectionDivider";
import { formatDateTime, splitTitle } from "@/lib/format";
import { Masthead } from "@/components/Masthead";
import { themenFuerArtikel } from "@/lib/themen";

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
      logo: {
        "@type": "ImageObject",
        url: "https://www.republicofpixels.com/brand/r-mark-navy.png",
        width: 401,
        height: 464,
      },
    },
    mainEntityOfPage: `https://www.republicofpixels.com/artikel/${article.slug}`,
  };

  return (
    <>
      <Masthead />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-article px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Polygon-Anlehnung (Tim, 15.08.2026): Rubrik + Spielname als EINE
            Zeile im Zeitungsstil, danach die fette Schlagzeile — die
            Plattform-Chips wandern unter die Autorenzeile, damit der Kopf
            eine klare Lesefolge hat: Wo bin ich? Was ist passiert? Von wem? */}
        {(() => {
          const { kicker, headline } = splitTitle(article.title, article.tags);
          return (
            <>
              <p className="mb-3 text-[14px] font-extrabold tracking-[0.1em] text-accent">
                {CATEGORY_LABELS[article.category].toUpperCase()}
                {kicker && <span className="text-text-tertiary"> · </span>}
                {kicker && <span>{kicker.toUpperCase()}</span>}
              </p>
              <h1 className="text-[32px] font-black leading-[1.12] tracking-[-0.015em] text-text-primary sm:text-[46px]">
                {headline}
              </h1>
            </>
          );
        })()}
        <p className="mt-4 text-lg leading-relaxed text-text-secondary sm:text-[21px] sm:leading-[1.45]">{article.subtitle}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-border-subtle py-4">
          {/* Autorenzeile klickbar (Leser-Audit 08.08.2026): führt zu
              "Die Köpfe hinter der Republic" — Vertrauen + E-E-A-T. */}
          <Link href="/ueber-uns" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/r-avatar.png" alt="" className="h-full w-full" />
            </span>
            <span className="text-sm font-bold text-text-primary">Von {article.author}</span>
          </Link>
          <span className="text-sm text-text-tertiary">{formatDateTime(article.publishedAt)}</span>
          <span className="text-sm text-text-tertiary">{article.readingTimeMinutes} Min. Lesezeit</span>
          <span className="ml-auto flex items-center gap-2">
            {article.platforms.map((p) => (
              <PlatformIcon key={p} platform={p} className="h-[18px] w-[18px] text-text-tertiary" />
            ))}
          </span>
        </div>

        {article.isLeakOrRumor && (
          <div className="mt-6">
            <LeakBanner />
          </div>
        )}

        {/* Pixel-Treppen-Rahmen wie im abgenommenen Hell-Entwurf. */}
        <figure className="mt-8">
          <div className="treppe-tl">
            <div className="treppe-innen aspect-[16/9]">
              <ArticleMedia article={article} priority sizes="(max-width: 768px) 100vw, 680px" className="h-full w-full" />
            </div>
          </div>
          {article.image?.credit && (
            <figcaption className="mt-2.5 text-xs text-text-tertiary">
              {article.image.credit}
            </figcaption>
          )}
        </figure>

        <TldrBox items={article.tldr} />

        <ArticleBody blocks={article.body} inlineRelated={related[0]} />

        {/* Fester Bauplan-Platz der Community-Umfrage (08.08.2026):
            direkt nach der Textstrecke, vor der Einordnung. */}
        {article.poll && <PollBox articleSlug={article.slug} poll={article.poll} />}

        <WhyItMattersBox text={article.whyItMatters} />

        {article.review && <ReviewBox review={article.review} />}

        <SourcesBox sources={article.sources} />

        {/* Themen-Hubs (SEO-Baustein 08.08.2026): Tags mit eigener Hub-Seite
            werden klickbar — gebündelte interne Verlinkung pro Spiel/Thema. */}
        {(() => {
          const themen = themenFuerArtikel(article);
          if (themen.length === 0) return null;
          return (
            <div className="my-8">
              <p className="mb-3 text-[13px] font-semibold tracking-wide text-text-tertiary">
                MEHR ZU DIESEN THEMEN
              </p>
              <div className="flex flex-wrap gap-2">
                {themen.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/thema/${t.slug}`}
                    className="inline-flex items-center rounded-full border border-border-subtle bg-surface-card px-3.5 py-1.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent/50 hover:bg-surface-hover"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        <WeiterlesenBox articles={related.slice(1)} />

        <div className="my-8 flex flex-wrap items-center justify-between gap-4 border-y border-border-subtle py-6">
          <ArticleReactions articleSlug={article.slug} />
          <ShareButtons title={article.title} />
        </div>

        <CommentSection articleSlug={article.slug} />
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-16">
          {/* NotchKarten statt neutraler Kachel-Karten (Polygon-Anlehnung):
              dieselbe Kartensprache wie auf der Startseite. */}
          <h2 className="mb-5 text-[26px] font-black tracking-tight text-text-primary sm:text-[34px]">
            Mehr zum Thema
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <NotchKarte key={a.slug} article={a} />
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
