import type { Metadata } from "next";
import Link from "next/link";
import { getAlleThemen } from "@/lib/themen";
import { Masthead } from "@/components/Masthead";

// Übersicht aller Themen-Hubs — Einstieg für Leser und Crawler
// (jeder Hub ist von hier aus verlinkt).

export const metadata: Metadata = {
  title: "Alle Themen",
  description:
    "Alle Themen bei Republic of Pixels im Überblick — von GTA 6 bis Switch 2: News, Leaks und Reviews pro Spiel und Thema.",
  alternates: { canonical: "/themen" },
};

export default function ThemenPage() {
  const themen = getAlleThemen();

  return (
    <>
      <Masthead />
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Alle Themen
        </h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Unsere Berichterstattung nach Spielen und Themen gebündelt — jedes
          Thema mit allen zugehörigen News, Leaks und Reviews.
        </p>

        <div className="mt-10 flex flex-wrap gap-2.5">
          {themen.map((t) => (
            <Link
              key={t.slug}
              href={`/thema/${t.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-accent/50 hover:bg-surface-hover"
            >
              {t.label}
              <span className="text-xs font-normal text-text-tertiary">
                {t.articles.length}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
