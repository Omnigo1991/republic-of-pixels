"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { getArticleBySlug } from "@/lib/articles";
import { PixelDivider } from "./PixelDivider";

interface TrendTag {
  tag: string;
  kommentare: number;
}

// Trending-Tags der letzten 24 Std., berechnet aus echten Kommentaren
// (keine neue Infrastruktur nötig — nutzt die bestehende comments-Tabelle).
export function GeradeImGespraech() {
  const [tags, setTags] = useState<TrendTag[] | null>(null);

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
        const proTag = new Map<string, number>();
        for (const [slug, anzahl] of proArtikel) {
          const artikel = getArticleBySlug(slug);
          if (!artikel) continue;
          for (const tag of artikel.tags) {
            proTag.set(tag, (proTag.get(tag) ?? 0) + anzahl);
          }
        }
        const sortiert = [...proTag.entries()]
          .map(([tag, kommentare]) => ({ tag, kommentare }))
          .sort((a, b) => b.kommentare - a.kommentare)
          .slice(0, 6);
        setTags(sortiert);
      });
  }, []);

  if (!tags || tags.length === 0) return null;

  return (
    <section aria-labelledby="gespraech-heading" className="py-10">
      <h2 id="gespraech-heading" className="mb-3 text-xl font-semibold tracking-tight text-text-primary">
        Gerade im Gespräch
      </h2>
      <PixelDivider />
      <div className="flex flex-wrap gap-2.5">
        {tags.map((t) => (
          <Link
            key={t.tag}
            href={`/suche?q=${encodeURIComponent(t.tag)}`}
            className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-card px-4 py-2 text-sm transition-colors hover:border-accent/50 hover:bg-surface-hover"
          >
            <span className="font-medium text-text-primary">{t.tag}</span>
            <span className="text-accent">{t.kommentare} {t.kommentare === 1 ? "Kommentar" : "Kommentare"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
