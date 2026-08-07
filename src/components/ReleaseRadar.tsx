import Link from "next/link";
import type { Platform } from "@/lib/types";
import { PlatformIcon } from "./PlatformIcons";
import { SectionDivider } from "./SectionDivider";
import releasesData from "@/content/releases.json";

interface ReleaseEntry {
  title: string;
  date: string;
  platforms: Platform[];
  articleSlug?: string;
}

// Release-Radar: kuratierte Leiste der nächsten Releases (Nutzwert-Sektion,
// die reine News-Ticker nicht bieten). Datenquelle: src/content/releases.json —
// wird redaktionell bzw. künftig von der Pipeline gepflegt; vergangene Termine
// fallen beim Build automatisch raus.
export function ReleaseRadar() {
  // Zeigt alle Termine der kommenden zwei Monate (Betreiber-Vorgabe 05.08.2026).
  const today = new Date().toISOString().slice(0, 10);
  const inZweiMonaten = new Date(Date.now() + 62 * 86400000).toISOString().slice(0, 10);
  const upcoming = (releasesData as unknown as ReleaseEntry[])
    .filter((r) => r.date >= today && r.date <= inZweiMonaten)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 9);

  if (upcoming.length === 0) return null;

  return (
    <section aria-labelledby="radar-heading" className="py-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="radar-heading" className="text-xl font-semibold tracking-tight text-text-primary">
          Release-Radar
        </h2>
        <span className="text-xs text-text-tertiary">Die nächsten Termine</span>
      </div>
      <SectionDivider />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((r) => {
          const inner = (
            <div className="flex h-full min-w-0 items-center gap-4 rounded-2xl border border-border-subtle bg-surface-card p-4 transition-all duration-300 hover:bg-surface-hover">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08]">
                <span className="text-lg font-bold leading-none text-accent">
                  {r.date.slice(8, 10)}
                </span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent/80">
                  {new Date(r.date + "T12:00:00").toLocaleDateString("de-DE", { month: "short" })}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-semibold text-text-primary">
                  {r.title}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-text-tertiary">
                  {r.platforms.map((p) => (
                    <PlatformIcon key={p} platform={p} className="h-3.5 w-3.5" />
                  ))}
                </div>
              </div>
            </div>
          );
          return r.articleSlug ? (
            <Link key={r.title} href={`/artikel/${r.articleSlug}`} className="min-w-0">
              {inner}
            </Link>
          ) : (
            <div key={r.title} className="min-w-0">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
