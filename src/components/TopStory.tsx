import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { CategoryPill } from "./Badges";
import { formatDateTime, splitTitle } from "@/lib/format";

export function TopStory({ article }: { article: Article }) {
  const { kicker, headline } = splitTitle(article.title, article.tags);
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="group grid gap-6 lg:grid-cols-2 lg:gap-10 lg:items-center"
    >
      {/* Hell-auf-Navy-Styling: Die Top-Story sitzt auf dem Marken-Navy-Band. */}
      <div className="relative">
        {/* Slogan-Wortmarke (Betreiber-Freigabe 07.08.2026, Verge-inspiriert):
            liegt mit dem unteren Drittel auf der Bildoberkante und überragt
            das Bild ab sm seitlich um je 6%. Als SVG mit textLength, damit
            der Schriftzug bei jeder Bildbreite exakt gleich spannt — die
            viewBox-Masse (1536 Einheiten Gesamtbreite, Teile 1059/477)
            entsprechen der gemessenen Inter-900-Geometrie bei -0.02em. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 z-10 w-full -translate-x-1/2 -translate-y-[66%] select-none sm:w-[112%]"
        >
          <svg viewBox="0 0 1536 100" className="w-full">
            <text x="0" y="84" textLength="1059" lengthAdjust="spacingAndGlyphs" fontWeight="900" fontSize="100" letterSpacing="-2" fill="#F1F0F2">
              {"WILLKOMMEN IN DER "}
            </text>
            <text x="1059" y="84" textLength="477" lengthAdjust="spacingAndGlyphs" fontWeight="900" fontSize="100" letterSpacing="-2" fill="#02F0D1">
              REPUBLIC
            </text>
          </svg>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 shadow-elevated duration-500">
          <ArticleMedia article={article} priority sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
        </div>
      </div>
      <div>
        <div className="mb-4 flex items-center gap-3">
          <CategoryPill category={article.category} onDark />
          <span className="text-xs text-navy-dim">{formatDateTime(article.publishedAt)}</span>
          <span className="text-xs text-navy-dim">· {article.readingTimeMinutes} Min. Lesezeit</span>
        </div>
        {kicker && (
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-accent">
            {kicker}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-navy-text group-hover:text-accent transition-colors">
          {headline}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-navy-muted">{article.subtitle}</p>
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
