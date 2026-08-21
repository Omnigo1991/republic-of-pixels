import Link from "next/link";
import { getAllArticles } from "@/lib/articles";
import { splitTitle } from "@/lib/format";
import { SectionDivider } from "./SectionDivider";

// Patch-Radar (Tim, 21.08.2026): fuenftes Radar - die juengsten Update-
// und Patch-Meldungen der grossen Dauerbrenner. Vollautomatisch aus dem
// eigenen Artikelbestand: Was die Pipeline als Update-Meldung schreibt,
// erscheint hier von selbst. Kein eigener Datenpfad, keine Pflege.
const MUSTER = /update|patch|hotfix|season|saison|title-update/i;

export function PatchRadar() {
  const eintraege = getAllArticles()
    .filter((a) => MUSTER.test(a.title) && a.category !== "guides")
    .slice(0, 3);
  if (eintraege.length < 2) return null;

  return (
    <section aria-labelledby="patch-heading" className="py-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="patch-heading" className="text-[20px] font-semibold tracking-tight text-text-primary">
          Patch-Radar
        </h2>
      </div>
      <SectionDivider />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {eintraege.map((a) => {
          const { kicker, headline } = splitTitle(a.title, a.tags);
          return (
            <Link
              key={a.slug}
              href={`/artikel/${a.slug}`}
              className="group flex h-full min-w-0 flex-col rounded-2xl border border-border-subtle bg-surface-card p-4 transition-colors hover:border-accent/50"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                {kicker && (
                  <span className="truncate text-[12px] font-extrabold uppercase tracking-[0.06em] text-accent">
                    {kicker}
                  </span>
                )}
                <span className="shrink-0 rounded-full border border-accent/50 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                  UPDATE
                </span>
              </div>
              <p className="text-[14.5px] font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent line-clamp-3">
                {headline}
              </p>
              <p className="mt-auto pt-3 text-xs text-text-tertiary">
                {new Date(a.publishedAt).toLocaleDateString("de-CH", { day: "2-digit", month: "long" })}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
