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
      {/* items-baseline statt items-center: sonst sitzt der Titel mittig
          zwischen den hoeheren Pfeilen und der Abstand zur Linie faellt
          auf 16 px, waehrend alle anderen Sektionen 12 px haben. */}
      <div className="relative mb-3 flex items-baseline justify-between">
        <h2 id="popular-heading" className="text-xl font-semibold tracking-tight text-text-primary">
          Beliebt bei Lesern
        </h2>
        {/* Absolut gesetzt, damit die hoeheren Pfeile die Zeilenhoehe
            nicht vergroessern - sonst waere der Abstand zur Linie 15 px
            statt der 12 px, die jede andere Sektion hat. */}
        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2">
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
      className="blaetterpfeil flex h-9 w-9 items-center justify-center rounded-full border border-border-default text-text-secondary transition-colors hover:border-accent/60 hover:text-accent disabled:cursor-default disabled:opacity-35 disabled:hover:border-border-default disabled:hover:text-text-secondary"
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
      {/* Kappecke wie bei allen Artikeln (Tim, 19.08.2026): eckig = Artikel,
          rund = Werkzeug. Aussen der Verlauf als Rand, innen die Flaeche -
          zwei Ebenen, weil ein Beschnitt sonst den Rand an der Schraege
          wegschneiden wuerde. */}
      {/* EXAKT DIE GUIDES-BAUART (Tim, 21.08.2026): Text IM Bild auf dem
          76-px-Verlauf statt unter dem Bild - vorher trugen gleich grosse
          Kacheln zwei verschiedene Uebergaenge. Verlauf, Textlage und
          Schrift sind 1:1 aus der NotchKarte uebernommen; Rangnummer und
          Kategorie-Pille bleiben als Beliebt-Merkmale. */}
      <Link
        href={`/artikel/${article.slug}`}
        className="artikelkante group block h-full transition-all duration-300"
      >
        <span className="artikelkante__innen relative block h-[280px] overflow-hidden">
          <span className="absolute inset-0 block [&_img]:h-full [&_img]:w-full [&_img]:object-cover transition-transform duration-500 group-hover:scale-[1.03]">
            <ArticleMedia article={article} sizes="320px" className="h-full w-full" />
          </span>
          <span className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated/85 text-xs font-bold text-accent backdrop-blur">
            {String(rank).padStart(2, "0")}
          </span>
          <span
            className="absolute inset-x-0 bottom-0 block px-3.5 pb-3.5 pl-[30px] pt-[76px]"
            style={{ background: "linear-gradient(0deg, #0F0E20 0px, #0F0E20 calc(100% - 76px), rgba(15,14,32,0.9) calc(100% - 64px), rgba(15,14,32,0.68) calc(100% - 48px), rgba(15,14,32,0.4) calc(100% - 32px), rgba(15,14,32,0.16) calc(100% - 16px), rgba(15,14,32,0) 100%)" }}
          >
            <span className="mb-1.5 block">
              <CategoryPill category={article.category} />
            </span>
            {kicker && (
              <span className="mb-1 block text-[10px] font-extrabold tracking-[0.08em] text-accent line-clamp-1 sm:text-[11px]">
                {kicker.toUpperCase()}
              </span>
            )}
            <span className="block min-h-[2.6em] text-[16px] font-extrabold leading-[1.35] text-white line-clamp-2">
              {headline}
            </span>
          </span>
        </span>
      </Link>
    </article>
  );
}
