import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getByBereich } from "@/lib/articles";
import type { Bereich } from "@/lib/types";
import { ArticleListItem } from "@/components/ArticleListItem";

// RESSORTS (Tim, 24.08.2026): Der Header trennt News / Games / Hardware.
// "News" bleibt die chronologische Gesamtliste unter /kategorie/news,
// hier liegen die beiden Ressorts.
//
// WARUM EINE EIGENE ROUTE statt zwei weiterer Schlüssel in
// /kategorie/[slug]: Kategorie und Plattform beschreiben, WAS ein Artikel
// ist (News, Leak, Test) beziehungsweise für welches Gerät er gilt. Das
// Ressort beschreibt, WORUM es geht. Zwei verschiedene Dinge unter einer
// Route hätten sich beim nächsten Umbau gerächt.

const RESSORTS: Record<Bereich, { titel: string; intro: string }> = {
  games: {
    titel: "Games",
    intro:
      "Alles rund um Spiele: Ankündigungen, Leaks, Tests und die Geschichten hinter der Entwicklung.",
  },
  hardware: {
    titel: "Hardware",
    intro:
      "Grafikkarten, Prozessoren, Konsolen, Controller und Handhelds - News und Tests zu den Geräten, auf denen gespielt wird.",
  },
};

const SCHLUESSEL = Object.keys(RESSORTS) as Bereich[];

export function generateStaticParams() {
  return SCHLUESSEL.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const r = RESSORTS[params.slug as Bereich];
  if (!r) return { title: "Ressort" };
  return {
    title: r.titel,
    description: r.intro,
    // Canonical gegen Host-Duplikate (Google-Meldung 08.08.2026).
    alternates: { canonical: `/ressort/${params.slug}` },
  };
}

export default function RessortPage({ params }: { params: { slug: string } }) {
  const bereich = params.slug as Bereich;
  const ressort = RESSORTS[bereich];
  if (!ressort) notFound();

  const artikel = getByBereich(bereich);

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h1 className="text-[30px] font-black tracking-tight text-text-primary sm:text-[36px]">
        {ressort.titel}
      </h1>
      <p className="mt-3 max-w-2xl text-text-secondary">{ressort.intro}</p>

      <div className="mt-10 flex flex-col">
        {artikel.length === 0 && (
          <p className="py-16 text-center text-text-tertiary">
            Aktuell keine Artikel in diesem Ressort - schau bald wieder vorbei.
          </p>
        )}
        {artikel.map((a) => (
          <ArticleListItem key={a.slug} article={a} />
        ))}
      </div>
    </div>
  );
}
