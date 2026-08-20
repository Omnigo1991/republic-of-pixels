"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { getArticleBySlug } from "@/lib/articles";
import { splitTitle } from "@/lib/format";
import { SectionDivider } from "./SectionDivider";

interface TrendArtikel {
  slug: string;
  titel: string;
  kommentare: number;
}

// Artikel mit den meisten neuen Kommentaren der letzten 24 Std. - pro
// Artikel gezählt (nicht pro Tag), damit die Zahl beim Anklicken exakt
// nachvollziehbar ist.
export function GeradeImGespraech() {
  const [artikel, setArtikel] = useState<TrendArtikel[] | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    const seit = new Date(Date.now() - 24 * 3600000).toISOString();
    supabase
      .from("comments")
      .select("article_slug")
      .eq("deleted", false)
      .gte("created_at", seit)
      .limit(2000)
      .then(({ data }) => {
        const proArtikel = new Map<string, number>();
        for (const row of data ?? []) {
          proArtikel.set(row.article_slug, (proArtikel.get(row.article_slug) ?? 0) + 1);
        }
        const liste = [...proArtikel.entries()]
          .map(([slug, kommentare]) => {
            const a = getArticleBySlug(slug);
            if (!a) return null;
            return { slug, titel: splitTitle(a.title, a.tags).headline, kommentare };
          })
          .filter((x): x is TrendArtikel => x !== null)
          .sort((a, b) => b.kommentare - a.kommentare)
          .slice(0, 6);
        setArtikel(liste);
      });
  }, []);

  if (!artikel || artikel.length === 0) return null;

  return (
    <section aria-labelledby="gespraech-heading" className="py-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="gespraech-heading" className="text-[20px] font-semibold tracking-tight text-text-primary">
          Gerade im Gespräch
        </h2>
      </div>
      <SectionDivider />
      <div className="flex flex-wrap gap-2.5">
        {artikel.map((a) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}#kommentare-heading`}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border-default bg-surface-card px-4 py-2 text-sm transition-colors hover:border-accent/50 hover:bg-surface-hover"
          >
            <span className="truncate font-medium text-text-primary">{a.titel}</span>
            <span className="shrink-0 text-accent">{a.kommentare} {a.kommentare === 1 ? "Kommentar" : "Kommentare"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
