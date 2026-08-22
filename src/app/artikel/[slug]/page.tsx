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
import { BildKachel } from "@/components/next/Bausteine";
import { LeakBanner } from "@/components/Badges";
import { PlatformIcon } from "@/components/PlatformIcons";
import { ArticleBody } from "@/components/ArticleBody";
import { TldrBox, WhyItMattersBox, ReviewBox, SourcesBox } from "@/components/ArticleBoxes";
import { WeiterlesenBox } from "@/components/WeiterlesenBox";
import { PollBox } from "@/components/PollBox";
import { ShareButtons } from "@/components/ShareButtons";
import { CommentSection } from "@/components/CommentSection";
import { ArticleReactions } from "@/components/ArticleReactions";
import { HypeMeter } from "@/components/HypeMeter";
import { NotchKarte } from "@/components/StartseiteNeu";
import { SectionDivider } from "@/components/SectionDivider";
import { formatDateTime, splitTitle } from "@/lib/format";
import { themenFuerArtikel } from "@/lib/themen";
import { PLATFORM_LABELS } from "@/lib/types";

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
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-article px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Aufbau der Live-Seite (Tim, 19.08.2026): erst die Pillenreihe
            aus Rubrik und Plattformen, dann NUR der Spielbezug, dann die
            Schlagzeile. Die Rubrik steht nicht mehr als Text im Kicker -
            sie ist die erste Pille. */}
        {(() => {
          const { kicker, headline } = splitTitle(article.title, article.tags);
          return (
            <>
              {/* Rubrik und Plattformen tragen in dieser Reihe DIESELBE
                  Fassung (Tim, 20.08.2026). Die Rubrik-Pille nutzte vorher
                  border-default (44 % Cyan) und wirkte dadurch heller als
                  ihre Nachbarn mit border-subtle (30 %). */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border-subtle px-2.5 py-1 text-[11px] font-semibold tracking-wide text-text-secondary">
                  {CATEGORY_LABELS[article.category].toUpperCase()}
                </span>
                {article.platforms.map((pl) => (
                  <span
                    key={pl}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-1 text-[11px] font-semibold tracking-wide text-text-secondary"
                  >
                    <PlatformIcon platform={pl} className="h-3.5 w-3.5" />
                    {PLATFORM_LABELS[pl]}
                  </span>
                ))}
              </div>
              {kicker && (
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-accent">
                  {kicker}
                </p>
              )}
              <h1 className="schrift-normal w-fit bg-[linear-gradient(120deg,#02F0D1,#FF2E97)] bg-clip-text pb-1.5 text-[29px] font-bold leading-[1.13] tracking-[-0.015em] text-transparent sm:text-[42px]">
                {headline}
              </h1>
            </>
          );
        })()}
        <p className="mt-4 text-lg leading-relaxed text-text-secondary sm:text-[21px] sm:leading-[1.45]">{article.subtitle}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-border-subtle py-4">
          {/* Autorenzeile klickbar (Leser-Audit 08.08.2026): führt zu
              "Die Köpfe hinter der Republic" - Vertrauen + E-E-A-T. */}
          <Link href="/ueber-uns" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/r-avatar.png" alt="" className="h-full w-full" />
            </span>
            <span className="text-sm font-bold text-accent">{article.author}</span>
          </Link>
          <span className="text-sm text-text-tertiary">{formatDateTime(article.publishedAt)}</span>
          <span className="text-sm text-text-tertiary">{article.readingTimeMinutes} Min. Lesezeit</span>
        </div>

        {article.isLeakOrRumor && (
          <div className="mt-6">
            <LeakBanner />
          </div>
        )}

        {/* Kappecke wie bei allen Artikeln. Die Bildbeschriftung steht
            INNERHALB der Box (Tim, 19.08.2026) und haelt links Abstand
            zum Anschnitt, damit sie unten links mit dem Rand aufgeht. */}
        <figure className="mt-8">
          {/* Neues Design (22.08.2026): schlichter Glasrahmen statt
              Kappecke, die Bildquelle sitzt als Chip unten links IM Bild. */}
          <div className="overflow-hidden rounded-[22px]">
            <div>
              <div className="relative aspect-[16/9]">
                <ArticleMedia article={article} priority sizes="(max-width: 768px) 100vw, 680px" className="h-full w-full" />
                {article.image?.credit && (
                  // Ohne eigene Flaeche (Tim, 19.08.2026): die Angabe liegt
                  // auf dem Bild, der Schlagschatten traegt sie ueber jedem
                  // Motiv. Links haelt sie Abstand zum Anschnitt.
                  <figcaption className="absolute bottom-3 left-3 rounded-full border border-white/[0.16] bg-[rgba(12,11,26,0.62)] px-2.5 py-1 text-[11px] text-[#D7D9E5] backdrop-blur-[10px]">
                    {article.image.credit}
                  </figcaption>
                )}
              </div>
            </div>
          </div>
        </figure>

        <TldrBox items={article.tldr} />

        <ArticleBody blocks={article.body} inlineRelated={related[0]} />

        {/* Einordnung VOR der Beteiligung (Tim, 21.08.2026): erst sagt
            die Redaktion, warum die Meldung zaehlt, dann fragt sie die
            Leserschaft - Umfrage und Hype-Meter stehen als Paar dahinter. */}
        <WhyItMattersBox text={article.whyItMatters} />

        {article.poll && <PollBox articleSlug={article.slug} poll={article.poll} />}

        <HypeMeter articleSlug={article.slug} />

        {article.review && <ReviewBox review={article.review} />}

        <SourcesBox sources={article.sources} />

        {/* Themen-Hubs (SEO-Baustein 08.08.2026): Tags mit eigener Hub-Seite
            werden klickbar - gebündelte interne Verlinkung pro Spiel/Thema. */}
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
          <h2 className="mb-5 text-[24px] font-black tracking-tight text-text-primary sm:text-[28px]">
            Mehr zum Thema
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <div key={a.slug} className="h-[230px]">
                <BildKachel article={a} />
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={`/kategorie/${article.category}`}
              className="inline-flex items-center gap-2 rounded-full border border-accent/45 px-5 py-2.5 text-sm font-medium text-text-secondary hover:border-accent/70 hover:text-accent transition-colors"
            >
              Weiterlesen in {CATEGORY_LABELS[article.category]}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
