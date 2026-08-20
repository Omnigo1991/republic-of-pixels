import type { Metadata } from "next";
import Link from "next/link";
import { getByCategory } from "@/lib/articles";
import { ArticleListItem } from "@/components/ArticleListItem";
import { Masthead } from "@/components/Masthead";

// Guides-Rubrik (Tim-Freigabe 15.08.2026, "Schritt 1").
//
// Eigene Adresse /guides von Anfang an: Adressen lassen sich später nicht
// mehr ändern, ohne bei Google von vorn anzufangen. Der Reiter im Header
// kommt bewusst erst, wenn genug Guides da sind (ab etwa sechs) — ein
// Reiter vor zwei Artikeln ist ein leeres Restaurant.
//
// Bis dahin ist die Seite über Fusszeile, Themen und direkte Links
// erreichbar und zeigt einen ehrlichen Leer-Zustand statt einer leeren
// Liste.

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Ratgeber, die bleiben: Einsteigertipps, Update-Erklärungen und Übersichten zu aktuellen Spielen — mit klarem Stand, worauf sie sich beziehen.",
};

export default function GuidesPage() {
  const guides = getByCategory("guides");

  return (
    <>
      <Masthead />
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-[30px] font-black tracking-tight sm:text-[36px] text-text-primary">
            Guides
          </h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Ratgeber, die bleiben: Einsteigertipps, Update-Erklärungen und
            Übersichten — jeder Guide nennt den Stand, auf den er sich bezieht.
          </p>
        </header>

        {guides.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-8 text-center">
            <p className="text-text-primary font-semibold">
              Die ersten Guides sind in Arbeit.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Bis dahin findest du alle aktuellen Meldungen in den News.
            </p>
            <Link
              href="/kategorie/news"
              className="mt-5 inline-flex items-center rounded-full border border-border-default px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent/50 hover:text-accent"
            >
              Zu den News
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {guides.map((a) => (
              <ArticleListItem key={a.slug} article={a} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
