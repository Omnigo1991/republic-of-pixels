import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAlleThemen, getThema } from "@/lib/themen";
import { ArticleListItem } from "@/components/ArticleListItem";
import { Masthead } from "@/components/Masthead";
import { ThemenSteckbrief } from "@/components/ThemenSteckbrief";

// Themen-Hub (SEO-Baustein, 08.08.2026): Landeseite pro Spiel/Thema,
// automatisch aus den Artikel-Tags erzeugt (nur Themen mit >=3 Artikeln,
// siehe src/lib/themen.ts). Layout bewusst identisch zur Kategorie-Seite.

export function generateStaticParams() {
  return getAlleThemen().map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const thema = getThema(params.slug);
  if (!thema) return {};
  return {
    title: `${thema.label} News - alle Meldungen, Leaks & Reviews`,
    description: `${thema.label} bei Republic of Pixels: ${thema.articles.length} Artikel - News, Leaks und Einordnung, laufend aktualisiert und ohne Clickbait.`,
    alternates: { canonical: `/thema/${thema.slug}` },
  };
}

export default function ThemaPage({ params }: { params: { slug: string } }) {
  const thema = getThema(params.slug);
  if (!thema) notFound();

  return (
    <>
      <Masthead />
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
          <Link href="/themen" className="hover:underline">
            Thema
          </Link>
        </p>
        <h1 className="text-[30px] font-black tracking-tight text-text-primary sm:text-[36px]">
          {thema.label}
        </h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Alle News, Leaks und Reviews zu {thema.label} - {thema.articles.length}{" "}
          Artikel, laufend aktualisiert.
        </p>

        <ThemenSteckbrief slug={thema.slug} />

        <div className="mt-10 flex flex-col">
          {thema.articles.map((article) => (
            <ArticleListItem key={article.slug} article={article} />
          ))}
        </div>
      </div>
    </>
  );
}
