"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { CategoryPill } from "./Badges";
import { SectionDivider } from "./SectionDivider";
import { splitTitle } from "@/lib/format";

// Einzeilige Slider-Leiste (Betreiber-Vorgabe 04.08.2026, play3-Vorbild):
// Karten in einer Reihe, horizontal scrollbar mit Snap; Pfeile oben rechts
// blättern kartenweise. Auf Touch-Geräten wird natürlich gewischt.
export function PopularSection({ articles }: { articles: Article[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    el?.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el?.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("article");
    const step = card ? card.getBoundingClientRect().width + 20 : 340;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (!articles.length) return null;

  return (
    <section aria-labelledby="popular-heading" className="py-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="popular-heading" className="text-xl font-semibold tracking-tight text-text-primary">
          Beliebt bei Lesern
        </h2>
        <div className="flex items-center gap-2">
          <span className="mr-2 hidden text-xs text-text-tertiary sm:inline">Diese Woche</span>
          <SliderArrow direction="prev" onClick={() => scrollByCard(-1)} disabled={!canPrev} />
          <SliderArrow direction="next" onClick={() => scrollByCard(1)} disabled={!canNext} />
        </div>
      </div>
      <SectionDivider />

      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 scroll-pl-4 sm:-mx-1 sm:px-1 sm:scroll-pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {articles.map((a, i) => (
          <PopularCard key={a.slug} article={a} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

function SliderArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Vorherige Artikel" : "Weitere Artikel"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border-default text-text-secondary transition-colors hover:border-accent/60 hover:text-accent disabled:cursor-default disabled:opacity-35 disabled:hover:border-border-default disabled:hover:text-text-secondary"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4 w-4 ${direction === "prev" ? "rotate-180" : ""}`}
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function PopularCard({ article, rank }: { article: Article; rank: number }) {
  const { kicker, headline } = splitTitle(article.title, article.tags);
  return (
    <article className="w-[280px] shrink-0 snap-start sm:w-[320px]">
      <Link
        href={`/artikel/${article.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card transition-all duration-300 hover:bg-surface-hover"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <ArticleMedia
            article={article}
            sizes="320px"
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated/85 text-xs font-bold text-accent backdrop-blur">
            {String(rank).padStart(2, "0")}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div>
            <CategoryPill category={article.category} />
          </div>
          {kicker && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent line-clamp-1">
              {kicker}
            </p>
          )}
          <h3 className="text-[15px] font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent line-clamp-2">
            {headline}
          </h3>
        </div>
      </Link>
    </article>
  );
}
