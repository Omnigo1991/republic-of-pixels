"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getAllArticles } from "@/lib/articles";
import { CATEGORY_LABELS } from "@/lib/types";

export function SearchPanel({
  onNavigate,
  initialQuery = "",
}: {
  onNavigate?: () => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const articles = useMemo(() => getAllArticles(), []);

  // Beliebte Suchen: häufigste Tags über alle Artikel, als Startpunkt vor
  // der ersten Eingabe (Betreiber-Vorgabe 06.08.2026).
  const beliebteSuchen = useMemo(() => {
    const zaehler = new Map<string, number>();
    for (const a of articles) for (const t of a.tags) zaehler.set(t, (zaehler.get(t) ?? 0) + 1);
    return [...zaehler.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [articles]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return articles
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [articles, query]);

  return (
    <div className="w-full">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche nach Spielen, Plattformen, Themen…"
          className="w-full rounded-2xl border border-border-default bg-surface-card py-4 pl-12 pr-4 text-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {!query.trim() && beliebteSuchen.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 px-1 text-xs text-text-tertiary">BELIEBTE SUCHEN</p>
          <div className="flex flex-wrap gap-2">
            {beliebteSuchen.map((tag) => (
              <button
                key={tag}
                onClick={() => setQuery(tag)}
                className="rounded-full border border-border-default bg-surface-card px-3.5 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent/50 hover:text-text-primary"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {query.trim() && (
        <div className="mt-4 flex flex-col gap-1">
          {results.length === 0 && (
            <p className="px-2 py-6 text-center text-text-tertiary">
              Keine Treffer für „{query}“.
            </p>
          )}
          {results.map((a) => (
            <Link
              key={a.slug}
              href={`/artikel/${a.slug}`}
              onClick={onNavigate}
              className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 hover:bg-text-primary/[0.04] transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-text-primary">{a.title}</p>
                <p className="truncate text-sm text-text-tertiary">{a.excerpt}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-accent">
                {CATEGORY_LABELS[a.category]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Suche öffnen"
        className="flex h-9 w-9 items-center justify-center rounded-full text-current hover:opacity-70 transition-opacity"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-bg-base/80 backdrop-blur-sm px-4 pt-24 animate-fadeIn"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-border-default bg-bg-elevated p-4 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <SearchPanel onNavigate={() => setOpen(false)} />
            <button
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-xl py-2 text-sm text-text-tertiary hover:text-text-primary"
            >
              Schliessen (Esc)
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
