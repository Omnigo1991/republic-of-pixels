import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getByCategory,
  getByPlatform,
  CATEGORY_NAV,
  PLATFORM_NAV,
} from "@/lib/articles";
import type { Category, Platform } from "@/lib/types";
import { ArticleListItem } from "@/components/ArticleListItem";
import { CategoryChipBar } from "@/components/CategoryChipBar";
import { Masthead } from "@/components/Masthead";

const CATEGORY_KEYS = CATEGORY_NAV.map((c) => c.key) as Category[];
const PLATFORM_KEYS = PLATFORM_NAV.map((p) => p.key) as Platform[];

const CATEGORY_INTRO: Record<Category, string> = {
  breaking: "Die wichtigsten Eilmeldungen der Gaming-Branche - geprüft, eingeordnet, ohne Aufregung um der Aufregung willen.",
  news: "Der komplette News-Fluss aus PC-, Konsolen- und Branchenwelt.",
  leaks: "Gerüchte und Insider-Infos - klar gekennzeichnet, kritisch eingeordnet, nie als Fakt verkauft.",
  reviews: "Unser Urteil zu aktuellen Releases, mit dem Label-System von Republic of Pixels statt Punktewertung.",
  guides: "Ratgeber, die bleiben: Einsteigertipps, Update-Erklärungen und Übersichten - mit klarem Stand, worauf sie sich beziehen.",
};

const PLATFORM_INTRO: Record<Platform, string> = {
  pc: "Hardware, Steam-Releases und alles rund ums PC-Gaming.",
  playstation: "News und Reviews rund um PlayStation 5 und das PS-Ökosystem.",
  xbox: "Xbox, Game Pass und die Studios dahinter.",
  nintendo: "Switch 2, Nintendo-exklusive Titel und mehr.",
};

export function generateStaticParams() {
  return [...CATEGORY_KEYS, ...PLATFORM_KEYS].map((key) => ({ slug: key }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const label =
    CATEGORY_NAV.find((c) => c.key === params.slug)?.label ??
    PLATFORM_NAV.find((p) => p.key === params.slug)?.label;
  return {
    title: label ?? "Kategorie",
    // Canonical gegen Host-Duplikate (Google-Meldung 08.08.2026).
    alternates: { canonical: `/kategorie/${params.slug}` },
  };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const isCategory = CATEGORY_KEYS.includes(slug as Category);
  const isPlatform = PLATFORM_KEYS.includes(slug as Platform);
  if (!isCategory && !isPlatform) notFound();

  const articles = isCategory
    ? getByCategory(slug as Category)
    : getByPlatform(slug as Platform);

  const label = isCategory
    ? CATEGORY_NAV.find((c) => c.key === slug)!.label
    : PLATFORM_NAV.find((p) => p.key === slug)!.label;

  const intro = isCategory
    ? CATEGORY_INTRO[slug as Category]
    : PLATFORM_INTRO[slug as Platform];

  return (
    <>
      <Masthead variant="section" word={label} />
      <CategoryChipBar active={slug} />
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <h1 className="text-[30px] font-black tracking-tight text-text-primary sm:text-[36px]">
          {label}
        </h1>
        <p className="mt-3 max-w-2xl text-text-secondary">{intro}</p>

        <div className="mt-10 flex flex-col">
          {articles.length === 0 && (
            <p className="py-16 text-center text-text-tertiary">
              Aktuell keine Artikel in dieser Kategorie - schau bald wieder vorbei.
            </p>
          )}
          {articles.map((article) => (
            <ArticleListItem key={article.slug} article={article} />
          ))}
        </div>
      </div>
    </>
  );
}
