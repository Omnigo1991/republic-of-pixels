"use client";

import { useState } from "react";
import type { Article } from "@/lib/types";
import { ArticleListItem } from "./ArticleListItem";

// "Alle News" zeigt zunächst 12 Einträge; der Rest lässt sich per
// "Mehr anzeigen" nachladen (Betreiber-Vorgabe 05.08.2026).
const SICHTBAR_START = 12;
const SCHRITT = 12;

export function NewsListe({ articles }: { articles: Article[] }) {
  const [sichtbar, setSichtbar] = useState(SICHTBAR_START);
  const gezeigt = articles.slice(0, sichtbar);
  const rest = articles.length - sichtbar;

  return (
    <>
      <div className="flex flex-col">
        {gezeigt.map((article) => (
          <ArticleListItem key={article.slug} article={article} />
        ))}
      </div>
      {rest > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setSichtbar((s) => s + SCHRITT)}
            className="rounded-full border border-accent/50 px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            Mehr anzeigen
          </button>
        </div>
      )}
    </>
  );
}
