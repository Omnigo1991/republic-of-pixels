"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

// AUSFAHRENDES SUCHFELD (Tim, 15.08.2026): kein Pop-up-Fenster mehr —
// ein Klick auf die Lupe faehrt das Feld direkt in der Kopfzeile aus.
// Die Trefferliste haengt darunter als Panel, Escape und Klick daneben
// schliessen wieder.
export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const huelle = useRef<HTMLDivElement>(null);
  const articles = useMemo(() => getAllArticles(), []);
  const treffer = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return articles
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [articles, query]);

  useEffect(() => {
    if (!open) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    };
    const klick = (e: MouseEvent) => {
      if (huelle.current && !huelle.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", taste);
    document.addEventListener("mousedown", klick);
    return () => {
      document.removeEventListener("keydown", taste);
      document.removeEventListener("mousedown", klick);
    };
  }, [open]);

  return (
    <div ref={huelle} className="relative flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Suche schliessen" : "Suche öffnen"}
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B1A33] text-current transition-opacity hover:opacity-70"
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      {/* Das Feld gleitet nach LINKS ueber die Navigation, statt sie zu
          verdraengen (sonst wird das Logo weggeschoben). */}
      <div
        className={`absolute right-11 top-1/2 -translate-y-1/2 overflow-hidden rounded-full transition-[width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "w-[360px] opacity-100" : "pointer-events-none w-0 opacity-0"
        }`}
      >
        <input
          autoFocus={open}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Spiele, Themen, Guides …"
          className="h-10 w-[360px] rounded-full border-2 border-[rgba(15,13,44,0.25)] bg-white px-5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-[rgba(15,13,44,0.45)] focus:outline-none"
        />
      </div>

      {/* Trefferliste haengt AUSSERHALB des Animations-Containers, sonst
          wuerde sie vom overflow-hidden abgeschnitten. */}
      {open && query.trim() && (
        <div className="absolute right-0 top-[52px] z-10 w-[400px] overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-elevated">
          {treffer.length === 0 ? (
            <p className="px-4 py-4 text-sm text-text-secondary">Nichts gefunden für «{query}».</p>
          ) : (
            treffer.map((a) => (
              <Link
                key={a.slug}
                href={`/artikel/${a.slug}`}
                onClick={() => { setOpen(false); setQuery(""); }}
                className="block border-b border-border-subtle px-4 py-3 last:border-b-0 hover:bg-surface-card"
              >
                <p className="text-[11px] font-extrabold tracking-[0.06em] text-accent">
                  {CATEGORY_LABELS[a.category].toUpperCase()}
                </p>
                <p className="mt-0.5 text-[14.5px] font-bold leading-snug text-text-primary line-clamp-2">
                  {a.title}
                </p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
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
