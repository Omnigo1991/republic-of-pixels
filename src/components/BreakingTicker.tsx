import Link from "next/link";
import { getAllArticles } from "@/lib/articles";
import { splitTitle } from "@/lib/format";

const BREAKING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Schmales Breaking-Band direkt unter dem Header: erscheint automatisch,
// sobald die Pipeline einen Breaking-Artikel veröffentlicht, und verschwindet
// nach 24 Stunden von selbst (statischer Build — Bewertung zur Build-Zeit,
// jeder Pipeline-Lauf baut die Seite neu).
export function BreakingTicker() {
  const latest = getAllArticles().find(
    (a) =>
      a.category === "breaking" &&
      Date.now() - new Date(a.publishedAt).getTime() < BREAKING_MAX_AGE_MS
  );
  if (!latest) return null;

  const { headline } = splitTitle(latest.title, latest.tags);

  return (
    <Link
      href={`/artikel/${latest.slug}`}
      className="group block border-b border-accent-brand/20 bg-accent-brand/[0.07] outline-none transition-colors hover:bg-accent-brand/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-brand/70"
    >
      <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-brand opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-brand" />
        </span>
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-brand">
          Breaking
        </span>
        <span className="truncate text-sm text-text-primary group-hover:text-accent-brand transition-colors">
          {headline}
        </span>
        <span className="ml-auto hidden shrink-0 text-xs text-text-tertiary group-hover:text-accent-brand sm:inline">
          Zum Artikel →
        </span>
      </div>
    </Link>
  );
}
